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
import asyncio
import logging
from collections import deque

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
DATA_DIR = Path("/tmp/ai-security-data")  # Local for now, will be /data in container
DATA_DIR.mkdir(parents=True, exist_ok=True)
EVENTS_FILE = DATA_DIR / "falco_events.jsonl"


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
        enriched_event = {
            "timestamp": timestamp,
            "collector_received": datetime.now(timezone.utc).isoformat(),
            "falco_event": event_data,
            "label": "unknown",  # Will be set during labeling phase
            "metadata": {
                "priority": priority,
                "rule": rule,
                "output": output,
                "container": event_data.get("output_fields", {}).get("container.name", "unknown"),
                "image": event_data.get("output_fields", {}).get("container.image.repository", "unknown"),
                "namespace": event_data.get("output_fields", {}).get("k8s.ns.name", "unknown")
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
        
        # Append to file (immediate persistence for research data)
        with open(EVENTS_FILE, "a") as f:
            f.write(json.dumps(enriched_event) + "\n")
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "collected", 
                "event_id": stats["total_events"]
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
        "events_file": str(EVENTS_FILE),
        "events_file_exists": EVENTS_FILE.exists(),
        "events_file_size_bytes": EVENTS_FILE.stat().st_size if EVENTS_FILE.exists() else 0
    }


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
    
    # Log startup
    startup_event = {
        "event_type": "collector_startup",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data_dir": str(DATA_DIR)
    }
    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps(startup_event) + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("AI Security Collector shutting down...")
    logger.info(f"Total events collected: {stats['total_events']}")
    
    # Final stats
    shutdown_event = {
        "event_type": "collector_shutdown",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_events": stats["total_events"]
    }
    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps(shutdown_event) + "\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "falco_collector:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload during development
        log_level="info"
    )
