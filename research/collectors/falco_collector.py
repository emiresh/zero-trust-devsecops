"""
Falco Event Collector

Receives webhook events from Falcosidekick and stores them for analysis.
This is a NON-DISRUPTIVE observer - it does not impact existing alerting.

Falcosidekick sends events to:
  POST /events

Events are:
  1. Stored in JSONL format for dataset creation
  2. Optionally enriched with Prometheus metrics
  3. Labeled (normal/attack) based on current mode
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional
import json
import os
import asyncio
import logging
from collections import deque
from typing import Dict

# Import AI incident reporter for enhanced security analysis
from advisors.incident_reporter import IncidentReporter
# Import integrations for sending AI reports to external platforms
from collectors.integrations import SlackIntegration, WebhookIntegration
# Import Loki client for structured log storage
from collectors.loki_client import LokiClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Security Collector",
    description="Collects Falco events for ML-based anomaly detection",
    version="0.1.0"
)

# In-memory event buffer (flushes to disk periodically)
event_buffer = deque(maxlen=1000)

# Statistics
stats = {
    "total_events": 0,
    "events_by_priority": {},
    "events_by_rule": {},
    "last_event_time": None,
    "collector_start_time": datetime.now(timezone.utc).isoformat()
}

# Data directory (create if doesn't exist)
# Use DATA_DIR env var in container, fall back to /tmp for local dev
DATA_DIR = Path(os.getenv("DATA_DIR", "/tmp/ai-security-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
EVENTS_FILE = DATA_DIR / "falco_events.jsonl"
AI_REPORTS_FILE = DATA_DIR / "ai_reports.jsonl"

# Initialize AI incident reporter (gracefully degrades if Azure not configured)
ai_reporter = IncidentReporter()
logger.info(f"AI incident reporter initialized: {'enabled' if ai_reporter.enabled else 'disabled (Azure credentials not set)'}")

# Initialize integrations for sending AI reports
# Note: PagerDuty integration is handled by AlertManager (immediate 2-3s alerts)
# AI reports use Slack for team collaboration (15-20s with AI analysis)
slack_integration = SlackIntegration()
webhook_integration = WebhookIntegration()

# Initialize Loki client for structured log storage
loki_client = LokiClient()

# ---------------------------------------------------------------------------
# Deduplication: suppress repeated AI reports for the same rule+container
# within a rolling window to avoid Azure OpenAI quota burn during event storms.
# ---------------------------------------------------------------------------
DEDUP_WINDOW_SECONDS = int(os.getenv("AI_DEDUP_WINDOW_SECONDS", "60"))
_dedup_cache: Dict[str, datetime] = {}


def _should_generate_report(rule: str, container: str) -> bool:
    """Return True only if no report was generated for this rule+container recently."""
    key = f"{rule}:{container}"
    last = _dedup_cache.get(key)
    if last and (datetime.now(timezone.utc) - last).total_seconds() < DEDUP_WINDOW_SECONDS:
        logger.debug(f"Dedup suppressed AI report for '{rule}' on '{container}'")
        return False
    _dedup_cache[key] = datetime.now(timezone.utc)
    return True


async def _process_ai_and_notify(enriched_event: dict, priority: str, rule: str, timestamp: str) -> None:
    """
    Background task: generate AI report and send notifications.

    Runs fully off the request/response path so Falcosidekick never
    waits on Azure OpenAI (which can take 2-10 seconds).
    """
    metadata = enriched_event["metadata"]
    container = metadata.get("container") or metadata.get("hostname", "host-level")
    namespace = metadata.get("namespace") or "N/A"
    pod = metadata.get("pod", "N/A")
    process = metadata.get("process", "N/A")
    hostname = metadata.get("hostname", "N/A")

    if not _should_generate_report(rule, container):
        return

    try:
        event_context = {
            "falco_rule": rule,
            "container": container,
            "namespace": namespace,
            "pod": pod,
            "process": process,
            "hostname": hostname,
            "risk_level": priority,
            "risk_score": 0.9 if priority == "Critical" else 0.7 if priority == "Error" else 0.5,
            "behavioral_context": metadata["output"],
            "anomaly_score": 0.0,
        }

        # Run synchronous Azure OpenAI call in a thread so it doesn't block the event loop
        report = await asyncio.to_thread(ai_reporter.generate_report, event_context)

        if report:
            ai_record = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_timestamp": timestamp,
                "priority": priority,
                "rule": rule,
                "container": container,
                "namespace": namespace,
                "pod": pod,
                "process": process,
                "hostname": hostname,
                "ai_report": report,
                "event_id": stats["total_events"],
            }

            # --- Persist: Loki (primary) + JSONL (fallback) ---
            loki_ok = await loki_client.push_ai_report(ai_record)
            if not loki_ok:
                with open(AI_REPORTS_FILE, "a") as f:
                    f.write(json.dumps(ai_record) + "\n")

            logger.info(f"AI report generated for {priority} event: {rule} (loki={'ok' if loki_ok else 'fallback-jsonl'})")

            # Send notifications (already non-blocking create_tasks)
            asyncio.create_task(slack_integration.send_report(ai_record))
            asyncio.create_task(webhook_integration.send_report(ai_record))

    except Exception as e:
        logger.error(f"Failed to generate AI report: {e}", exc_info=True)


@app.post("/events")
async def receive_falco_event(request: Request):
    """
    Webhook endpoint for Falcosidekick.
    
    Falcosidekick sends POST with JSON body containing the Falco event.
    We store it with minimal processing - enrichment happens later.
    """
    try:
        # Parse incoming Falco event
        event_data = await request.json()
        
        # Extract key fields
        timestamp = event_data.get("time", datetime.now(timezone.utc).isoformat())
        priority = event_data.get("priority", "unknown")
        rule = event_data.get("rule", "unknown")
        output = event_data.get("output", "")
        
        # Create enriched event record
        # Extract container/k8s context from output_fields (may be null for host-level events)
        output_fields = event_data.get("output_fields", {})
        container_name = output_fields.get("container.name") or output_fields.get("container.id", "")
        namespace_name = output_fields.get("k8s.ns.name") or output_fields.get("k8s.pod.namespace", "")
        pod_name = output_fields.get("k8s.pod.name", "")
        
        enriched_event = {
            "timestamp": timestamp,
            "collector_received": datetime.now(timezone.utc).isoformat(),
            "falco_event": event_data,
            "label": "unknown",  # Will be set during labeling phase
            "metadata": {
                "priority": priority,
                "rule": rule,
                "output": output,
                "container": container_name if container_name else None,
                "image": output_fields.get("container.image.repository") or None,
                "namespace": namespace_name if namespace_name else None,
                "pod": pod_name if pod_name else None,
                "hostname": output_fields.get("hostname") or output_fields.get("host", None),
                "process": output_fields.get("proc.name") or output_fields.get("proc.cmdline", "")[:100] if output_fields.get("proc.cmdline") else None,
                "user": output_fields.get("user.name") or None
            }
        }
        
        # Add to buffer
        event_buffer.append(enriched_event)
        
        # Update statistics
        stats["total_events"] += 1
        stats["last_event_time"] = timestamp
        stats["events_by_priority"][priority] = stats["events_by_priority"].get(priority, 0) + 1
        stats["events_by_rule"][rule] = stats["events_by_rule"].get(rule, 0) + 1
        
        # Log receipt (at DEBUG level to avoid spam)
        logger.debug(f"Received event: {rule} | {priority} | {output[:100]}")
        
        # --- Persist raw event: Loki (primary) + JSONL (fallback) ---
        loki_ok = await loki_client.push_falco_event(enriched_event)
        if not loki_ok:
            with open(EVENTS_FILE, "a") as f:
                f.write(json.dumps(enriched_event) + "\n")

        # Kick off AI enrichment in the background — webhook returns immediately.
        # Dedup logic inside _process_ai_and_notify prevents storm flooding.
        ai_queued = False
        if priority in ["Critical", "Error", "Warning"] and ai_reporter.enabled:
            asyncio.create_task(
                _process_ai_and_notify(enriched_event, priority, rule, timestamp)
            )
            ai_queued = True

        return JSONResponse(
            status_code=200,
            content={
                "status": "collected",
                "event_id": stats["total_events"],
                "loki_stored": loki_ok,
                "ai_report_queued": ai_queued,
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing Falco event: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {
        "status": "healthy",
        "service": "ai-security-collector",
        "uptime_seconds": (
            datetime.now(timezone.utc) - 
            datetime.fromisoformat(stats["collector_start_time"])
        ).total_seconds()
    }


@app.get("/stats")
async def get_statistics():
    """
    Get collector statistics.
    Useful for monitoring and validation during data collection phase.
    """
    return {
        "statistics": stats,
        "buffer_size": len(event_buffer),
        "loki": {
            "url": loki_client.url,
            "enabled": loki_client.enabled,
            "note": "Primary store. JSONL files are fallback only.",
        },
        "dedup": {
            "window_seconds": DEDUP_WINDOW_SECONDS,
            "active_keys": len(_dedup_cache),
        },
        "jsonl_fallback": {
            "events_file": str(EVENTS_FILE),
            "events_file_exists": EVENTS_FILE.exists(),
            "events_file_size_bytes": EVENTS_FILE.stat().st_size if EVENTS_FILE.exists() else 0,
            "ai_reports_file": str(AI_REPORTS_FILE),
            "ai_reports_file_exists": AI_REPORTS_FILE.exists(),
            "ai_reports_file_size_bytes": AI_REPORTS_FILE.stat().st_size if AI_REPORTS_FILE.exists() else 0,
        },
        "ai_reporter_enabled": ai_reporter.enabled,
    }


@app.get("/reports")
async def get_ai_reports(limit: int = 10, priority: str = None):
    """
    Get AI-generated incident reports.
    
    Query params:
    - limit: Number of reports to return (default: 10, max: 100)
    - priority: Filter by priority (Critical, Error, Warning)
    """
    try:
        if not AI_REPORTS_FILE.exists():
            return {"reports": [], "count": 0, "message": "No AI reports generated yet"}
        
        reports = []
        with open(AI_REPORTS_FILE, "r") as f:
            for line in f:
                if line.strip():
                    report = json.loads(line)
                    if priority is None or report.get("priority") == priority:
                        reports.append(report)
        
        # Return most recent first
        reports = reports[-min(limit, 100):][::-1]
        
        return {
            "reports": reports,
            "count": len(reports),
            "ai_enabled": ai_reporter.enabled
        }
    
    except Exception as e:
        logger.error(f"Error reading AI reports: {e}")
        return {"error": str(e), "reports": [], "count": 0}


@app.get("/reports/{event_id}")
async def get_report_by_id(event_id: int):
    """Get specific AI report by event ID"""
    try:
        if not AI_REPORTS_FILE.exists():
            raise HTTPException(status_code=404, detail="No reports found")
        
        with open(AI_REPORTS_FILE, "r") as f:
            for line in f:
                if line.strip():
                    report = json.loads(line)
                    if report.get("event_id") == event_id:
                        return report
        
        raise HTTPException(status_code=404, detail=f"Report for event {event_id} not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reports/latest/text", response_class=JSONResponse)
async def get_latest_report_text():
    """Get the latest AI report in human-readable text format"""
    try:
        if not AI_REPORTS_FILE.exists():
            return {"message": "No AI reports generated yet"}
        
        # Read last report
        with open(AI_REPORTS_FILE, "r") as f:
            lines = f.readlines()
            if not lines:
                return {"message": "No reports available"}
            
            report = json.loads(lines[-1])
            
            # Format as readable text
            text = f"""
╔══════════════════════════════════════════════════════════════╗
║           AI SECURITY INCIDENT REPORT #{report['event_id']}              
╚══════════════════════════════════════════════════════════════╝

Priority:   {report['priority']}
Rule:       {report['rule']}
Container:  {report['container']}
Namespace:  {report['namespace']}
Timestamp:  {report['timestamp']}

{report['ai_report']}

════════════════════════════════════════════════════════════════
"""
            return {"report": text, "metadata": {k: v for k, v in report.items() if k != 'ai_report'}}
    
    except Exception as e:
        return {"error": str(e)}


@app.get("/events/recent")
async def get_recent_events(limit: int = 10):
    """
    Return the most recent events from the buffer.
    For debugging and validation.
    """
    recent = list(event_buffer)[-limit:]
    return {
        "count": len(recent),
        "events": recent
    }


@app.post("/label/set")
async def set_label_mode(label: str):
    """
    Set the current labeling mode.
    
    During attack simulations, call:
      POST /label/set?label=attack
    
    During normal operation:
      POST /label/set?label=normal
    
    This allows automated labeling during data collection.
    """
    if label not in ["normal", "attack", "unknown"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid label. Must be: normal, attack, or unknown"
        )
    
    # In production, this would update a state variable
    # For now, log it
    logger.info(f"Label mode changed to: {label}")
    
    return {
        "status": "updated",
        "current_label": label,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.on_event("startup")
async def startup_event():
    """Initialize collector on startup"""
    logger.info("AI Security Collector starting...")
    logger.info(f"Events will be stored in: {EVENTS_FILE}")
    logger.info(f"Listening on port 8000 for Falco webhooks")
    
    # Create data directory if it doesn't exist
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Log startup to Loki (probe happens here) + JSONL fallback
    startup_payload = {
        "event_type": "collector_startup",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data_dir": str(DATA_DIR),
    }
    loki_ok = await loki_client.push_lifecycle("collector_startup", startup_payload)
    if not loki_ok:
        with open(EVENTS_FILE, "a") as f:
            f.write(json.dumps(startup_payload) + "\n")
    logger.info(f"Loki storage: {'active' if loki_client.enabled else 'unavailable — using JSONL fallback'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("AI Security Collector shutting down...")
    logger.info(f"Total events collected: {stats['total_events']}")
    
    # Final stats
    shutdown_payload = {
        "event_type": "collector_shutdown",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_events": stats["total_events"],
    }
    loki_ok = await loki_client.push_lifecycle("collector_shutdown", shutdown_payload)
    if not loki_ok:
        with open(EVENTS_FILE, "a") as f:
            f.write(json.dumps(shutdown_payload) + "\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "falco_collector:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload during development
        log_level="info"
    )
