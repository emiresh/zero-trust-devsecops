#!/bin/bash
# Monitor Kubernetes node status and log with timestamps

NODE=${1:-worker-1}
INTERVAL=${2:-10}
LOG_FILE="node-status-${NODE}-$(date +%Y%m%d_%H%M%S).log"

echo "Monitoring node: $NODE every ${INTERVAL}s → $LOG_FILE"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  {
    echo "====== $TIMESTAMP ======"
    kubectl get node "$NODE" --no-headers | awk '{print "STATUS: "$2}'
    kubectl describe node "$NODE" \
      | grep -E 'MemoryPressure|DiskPressure|PIDPressure|cpu:|memory:|Ready' \
      | head -20
    echo ""
  } | tee -a "$LOG_FILE"

  sleep "$INTERVAL"
done
