"""
Loki Push Client

Sends Falco events and AI reports to Loki via the HTTP push API.
Replaces flat JSONL file storage with a queryable, indexed log store.

Loki stream labels (used for Grafana filtering):
  job="ai-security-collector"
  type="falco_event" | "ai_report" | "lifecycle"
  priority="Critical" | "Error" | "Warning" | "Info"
  rule=<falco_rule_name>
  namespace=<k8s_namespace>
  container=<container_name>

Loki push API: POST /loki/api/v1/push
  {
    "streams": [
      {
        "stream": { ...labels },
        "values": [["<unix_nanoseconds>", "<log_line>"]]
      }
    ]
  }
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)

# Default: standard Loki single-binary service in monitoring namespace
LOKI_URL = os.getenv("LOKI_URL", "http://loki-stack.monitoring:3100")
LOKI_PUSH_PATH = "/loki/api/v1/push"
LOKI_TIMEOUT_SECONDS = 5.0


class LokiClient:
    """
    Async Loki push client.
    
    Pushes structured JSON log lines to Loki with stream labels for
    efficient querying in Grafana LogQL.
    
    Degrades gracefully if Loki is unreachable — errors are logged
    but never propagate to the caller.
    """

    def __init__(self, url: str = LOKI_URL):
        self.url = url.rstrip("/")
        self.push_url = f"{self.url}{LOKI_PUSH_PATH}"
        self._enabled: Optional[bool] = None  # None = not yet probed
        logger.info(f"LokiClient configured with endpoint: {self.url}")

    async def _probe(self) -> bool:
        """Check Loki is reachable (called once on first push)."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.url}/ready")
                if r.status_code == 200:
                    logger.info("Loki connectivity confirmed — events will be pushed to Loki")
                    return True
                logger.warning(f"Loki /ready returned {r.status_code} — falling back to JSONL only")
                return False
        except Exception as e:
            logger.warning(f"Loki unreachable ({e}) — falling back to JSONL only")
            return False

    async def push(
        self,
        labels: Dict[str, str],
        payload: Dict[str, Any],
        timestamp_ns: Optional[int] = None,
    ) -> bool:
        """
        Push a single log entry to Loki.

        Args:
            labels:       Loki stream labels (all values must be strings)
            payload:      Dict that will be serialised to a JSON log line
            timestamp_ns: Unix epoch nanoseconds. Defaults to now.

        Returns:
            True if successfully delivered, False otherwise.
        """
        # Lazy probe on first call
        if self._enabled is None:
            self._enabled = await self._probe()

        if not self._enabled:
            return False

        ts_ns = str(timestamp_ns or (time.time_ns()))
        log_line = json.dumps(payload, default=str)

        body = {
            "streams": [
                {
                    "stream": {k: str(v) for k, v in labels.items()},
                    "values": [[ts_ns, log_line]],
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=LOKI_TIMEOUT_SECONDS) as client:
                r = await client.post(
                    self.push_url,
                    json=body,
                    headers={"Content-Type": "application/json"},
                )
                if r.status_code in (200, 204):
                    return True
                logger.error(
                    f"Loki push failed: HTTP {r.status_code} — {r.text[:200]}"
                )
                return False

        except httpx.TimeoutException:
            logger.warning("Loki push timed out — event stored in JSONL fallback")
            return False
        except Exception as e:
            logger.error(f"Loki push error: {e}")
            return False

    # -------------------------------------------------------------------------
    # Convenience helpers
    # -------------------------------------------------------------------------

    async def push_falco_event(self, event: Dict[str, Any]) -> bool:
        """Push a raw Falco event under the 'falco_event' stream type."""
        meta = event.get("metadata", {})
        labels = {
            "job":       "ai-security-collector",
            "type":      "falco_event",
            "priority":  meta.get("priority", "unknown"),
            "rule":      meta.get("rule", "unknown")[:64],   # Loki label length limit
            "namespace": meta.get("namespace", "unknown"),
            "container": meta.get("container", "unknown"),
        }
        return await self.push(labels, event)

    async def push_ai_report(self, ai_record: Dict[str, Any]) -> bool:
        """
        Push an AI-enriched incident report under the 'ai_report' stream type.

        The log LINE is the AI report text itself so Grafana renders it
        as readable multi-line content instead of a raw JSON blob.
        Metadata (rule, priority, container, etc.) goes into stream labels
        and a compact JSON header prepended to the line.
        """
        labels = {
            "job":       "ai-security-collector",
            "type":      "ai_report",
            "priority":  ai_record.get("priority", "unknown"),
            "rule":      str(ai_record.get("rule", "unknown"))[:64],
            "namespace": ai_record.get("namespace", "unknown"),
            "container": ai_record.get("container", "unknown"),
        }

        ai_text = ai_record.get("ai_report", "No report generated")

        # Metadata header prepended so it appears at the top of the log entry
        meta = {
            "event_id":        ai_record.get("event_id"),
            "timestamp":       ai_record.get("timestamp"),
            "event_timestamp": ai_record.get("event_timestamp"),
            "rule":            ai_record.get("rule"),
            "priority":        ai_record.get("priority"),
            "container":       ai_record.get("container"),
            "namespace":       ai_record.get("namespace"),
        }
        log_line = f"{json.dumps(meta)}\n\n{ai_text}"

        ts_ns = str(time.time_ns())
        body = {
            "streams": [
                {
                    "stream": {k: str(v) for k, v in labels.items()},
                    "values": [[ts_ns, log_line]],
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=LOKI_TIMEOUT_SECONDS) as client:
                r = await client.post(
                    self.push_url,
                    json=body,
                    headers={"Content-Type": "application/json"},
                )
                return r.status_code in (200, 204)
        except Exception as e:
            logger.error(f"Loki push_ai_report error: {e}")
            return False

    async def push_lifecycle(self, event_type: str, payload: Dict[str, Any]) -> bool:
        """Push a collector lifecycle event (startup/shutdown)."""
        labels = {
            "job":  "ai-security-collector",
            "type": "lifecycle",
            "event_type": event_type,
        }
        return await self.push(labels, payload)

    @property
    def enabled(self) -> bool:
        """True once Loki has been successfully probed."""
        return self._enabled is True
