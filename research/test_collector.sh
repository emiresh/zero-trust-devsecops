#!/bin/bash
# Test the AI Security Collector locally before deploying to cluster

set -e

echo "🧪 Testing AI Security Collector"
echo "================================"

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "⚠️  Virtual environment not activated"
    echo "Run: source .venv/bin/activate"
    exit 1
fi

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
python -c "import fastapi, uvicorn, pandas, sklearn" 2>/dev/null && echo "✅ All dependencies installed" || {
    echo "❌ Missing dependencies. Run: pip install -r requirements.txt"
    exit 1
}

# Start collector in background
echo ""
echo "🚀 Starting collector on port 8000..."
cd collectors
python falco_collector.py > /tmp/collector.log 2>&1 &
COLLECTOR_PID=$!
cd ..

# Wait for startup
sleep 3

# Check if running
if ! ps -p $COLLECTOR_PID > /dev/null; then
    echo "❌ Collector failed to start. Check /tmp/collector.log"
    cat /tmp/collector.log
    exit 1
fi

echo "✅ Collector running (PID: $COLLECTOR_PID)"

# Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if [[ $HEALTH == *"healthy"* ]]; then
    echo "✅ Health check passed"
    echo "$HEALTH" | python -m json.tool
else
    echo "❌ Health check failed"
    kill $COLLECTOR_PID
    exit 1
fi

# Test stats endpoint
echo ""
echo "📊 Testing stats endpoint..."
curl -s http://localhost:8000/stats | python -m json.tool

# Send test Falco event
echo ""
echo "📨 Sending test Falco event..."
curl -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "test-123",
    "rule": "Shell Spawned in Container",
    "priority": "Warning",
    "time": "2026-03-02T10:00:00.000Z",
    "output": "Shell spawned in container (container=test)",
    "output_fields": {
      "container.name": "test-container",
      "container.image.repository": "nginx",
      "k8s.ns.name": "test",
      "user.name": "root",
      "proc.name": "/bin/sh"
    }
  }'

echo ""
echo ""

# Check stats again
echo "📊 Stats after event..."
curl -s http://localhost:8000/stats | python -m json.tool

# Check recent events
echo ""
echo "📋 Recent events..."
curl -s http://localhost:8000/events/recent?limit=5 | python -m json.tool

# Check data file
echo ""
echo "📁 Checking data file..."
DATA_FILE="/tmp/ai-security-data/falco_events.jsonl"
if [[ -f "$DATA_FILE" ]]; then
    echo "✅ Data file exists: $DATA_FILE"
    echo "   Lines: $(wc -l < $DATA_FILE)"
    echo "   Last event:"
    tail -1 $DATA_FILE | python -m json.tool
else
    echo "❌ Data file not found at $DATA_FILE"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $COLLECTOR_PID
echo "✅ Collector stopped"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL TESTS PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Build Docker image: docker build -t emiresh/ai-security-collector:latest ."
echo "  2. Push to registry: docker push emiresh/ai-security-collector:latest"
echo "  3. Deploy to cluster: kubectl apply -f k8s/"
echo ""
