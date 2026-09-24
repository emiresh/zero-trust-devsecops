#!/bin/bash
# Troubleshoot PagerDuty AlertManager Integration

set -e

echo "🔍 PagerDuty AlertManager Troubleshooting"
echo "=========================================="
echo ""

# Check 1: Secret exists
echo "1️⃣ Checking PagerDuty secret..."
kubectl get secret alertmanager-pagerduty-key -n monitoring 2>/dev/null && echo "✅ Secret exists" || echo "❌ Secret NOT found"
echo ""

# Check 2: Verify secret content
echo "2️⃣ Checking secret key name..."
kubectl get secret alertmanager-pagerduty-key -n monitoring -o jsonpath='{.data}' | grep -o '"[^"]*"' | head -1
echo ""

# Check 3: AlertManager pods running
echo "3️⃣ Checking AlertManager pods..."
kubectl get pods -n monitoring | grep alertmanager
echo ""

# Check 4: Check if secret is mounted
echo "4️⃣ Checking if secret is mounted in AlertManager pod..."
POD=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager -o name | head -1)
kubectl exec -n monitoring $POD -c alertmanager -- ls -la /etc/alertmanager/secrets/alertmanager-pagerduty-key/ 2>/dev/null && echo "✅ Secret is mounted" || echo "❌ Secret NOT mounted"
echo ""

# Check 5: View AlertManager config
echo "5️⃣ Checking AlertManager configuration..."
kubectl exec -n monitoring $POD -c alertmanager -- cat /etc/alertmanager/config/alertmanager.yaml.gz 2>/dev/null | gunzip | grep -A 10 "pagerduty" || echo "⚠️  PagerDuty config not found in AlertManager"
echo ""

# Check 6: AlertManager logs
echo "6️⃣ Checking AlertManager logs for errors..."
kubectl logs -n monitoring $POD -c alertmanager --tail=30 | grep -i "error\|pagerduty\|failed" || echo "No PagerDuty-related errors found"
echo ""

# Check 7: Check active alerts
echo "7️⃣ Checking active alerts in AlertManager..."
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093 > /dev/null 2>&1 &
PF_PID=$!
sleep 2
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | {alertname: .labels.alertname, state: .status.state}' 2>/dev/null || echo "⚠️  Could not fetch alerts (is jq installed?)"
kill $PF_PID 2>/dev/null
echo ""

# Check 8: Test AlertManager to PagerDuty connection
echo "8️⃣ Testing AlertManager connectivity..."
kubectl exec -n monitoring $POD -c alertmanager -- wget -O- --timeout=5 https://events.pagerduty.com 2>&1 | head -5
echo ""

echo "✅ Troubleshooting complete!"
echo ""
echo "📋 Next steps:"
echo "   1. If secret is not mounted, restart AlertManager pods"
echo "   2. Check AlertManager UI: kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093"
echo "   3. Then visit: http://localhost:9093"
echo ""
