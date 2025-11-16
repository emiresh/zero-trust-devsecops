# PagerDuty Integration Setup Guide

This guide explains how to integrate AlertManager with PagerDuty for incident management.

## 🎯 Why PagerDuty?

PagerDuty provides:
- ✅ **Same incident updates** - Alerts update the same incident (not separate messages like Slack)
- ✅ **Smart alerting** - Phone calls, SMS, push notifications
- ✅ **On-call scheduling** - Rotate who gets alerted
- ✅ **Escalation policies** - Auto-escalate if not acknowledged
- ✅ **Incident timeline** - Track resolution progress
- ✅ **Alert deduplication** - Automatic grouping of similar alerts
- ✅ **Ack/Resolve tracking** - Know when issues are handled

## 📋 Prerequisites

1. **PagerDuty account** - Sign up at https://www.pagerduty.com/
2. **Service created** in PagerDuty
3. **Integration Key** from PagerDuty

## 🚀 Setup Steps

### Step 1: Get PagerDuty Integration Key

1. Log into your PagerDuty account: https://[your-account].pagerduty.com/
2. Go to **Services** → Click your service (or create a new one)
3. Go to **Integrations** tab
4. Click **Add Integration**
5. Search for **Events API v2** and add it
6. Copy the **Integration Key** (looks like: `R03XXXXXXXXXXXXXXXXX`)

### Step 2: Create the Kubernetes Secret

**Option A: Using the setup script (Recommended)**

```bash
cd /Users/iresh/Documents/Projects/argo
./scripts/setup-pagerduty.sh
```

**Option B: Manual creation**

```bash
kubectl create secret generic alertmanager-pagerduty-key \
  --from-literal=integration-key='YOUR_INTEGRATION_KEY' \
  --namespace=monitoring
```

### Step 3: Deploy the Configuration

```bash
# Commit changes
git add clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml
git commit -m "Switch from Slack to PagerDuty for alerting"
git push

# ArgoCD will auto-sync, or manually:
kubectl apply -f clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml
```

### Step 4: Verify AlertManager Configuration

```bash
# Check AlertManager pods restarted
kubectl get pods -n monitoring | grep alertmanager

# Check logs
kubectl logs -n monitoring alertmanager-kube-prometheus-stack-alertmanager-0 | grep -i pagerduty
```

## 🧪 Testing

### Test 1: Trigger a test alert

```bash
# Create a pod that will crash
kubectl run test-crash --image=busybox -n dev -- sh -c "exit 1"

# Wait ~30 seconds, check PagerDuty for incident
```

### Test 2: Trigger Falco security alert

```bash
# Spawn shell in container (triggers Falco)
kubectl run test-shell --image=ubuntu -n dev -- sleep 3600
kubectl exec -it test-shell -n dev -- /bin/bash

# Check PagerDuty for security incident
```

### Test 3: Manual alert test

```bash
# Send test alert directly to AlertManager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093

# In another terminal:
curl -X POST http://localhost:9093/api/v1/alerts -d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "critical"
  },
  "annotations": {
    "summary": "Test alert from AlertManager"
  }
}]'
```

## 📊 Alert Routing

### Current Configuration:

```yaml
route:
  receiver: 'pagerduty-notifications'  # Default receiver
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'    # High priority incidents
    
    - match:
        severity: warning
      receiver: 'pagerduty-notifications'  # Normal priority incidents
```

### Alert Severity Mapping:

| Prometheus Severity | PagerDuty Severity | Action |
|---------------------|-------------------|---------|
| `critical` | Critical | Creates high-urgency incident |
| `warning` | Warning | Creates low-urgency incident |
| `info` | Info | (Not configured, will use default) |

## 🔧 Configuration Details

### What Gets Sent to PagerDuty:

```
Incident Title: [AlertName]
Description: [Alert Summary]
Details:
  - Firing alerts
  - Resolved alerts
  - Number of firing/resolved
  - Cluster name
  - Namespace
  - Pod name
  - Severity
Links:
  - View in Prometheus
```

### Example PagerDuty Incident:

```
🚨 HighMemoryUsage

Description:
Memory usage is 87% in namespace dev (threshold: 85%)

Details:
  Firing: HighMemoryUsage: Memory usage is 87%
  Cluster: test-cluster
  Namespace: dev
  Pod: freshbonds-api-gateway-xyz
  Severity: warning

[View in Prometheus →]
```

## 🎛️ Customization

### Change Alert Grouping

Edit `kube-prometheus-stack.yaml`:

```yaml
route:
  group_by: ['alertname', 'pod']  # Group by alert and pod
  group_wait: 30s                  # Wait 30s before sending
  group_interval: 5m               # Send updates every 5 minutes
  repeat_interval: 4h              # Repeat every 4 hours if not resolved
```

### Add More Receivers

```yaml
receivers:
  - name: 'pagerduty-database'
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-key/db-key
        severity: critical

routes:
  - match:
      component: database
    receiver: 'pagerduty-database'
```

### Filter Alerts

```yaml
# Only send critical alerts to PagerDuty
routes:
  - match_re:
      severity: critical
    receiver: 'pagerduty-critical'
  
  - match_re:
      severity: warning
    receiver: 'null'  # Ignore warnings
```

## 📱 PagerDuty Features to Configure

### 1. Notification Rules

In PagerDuty:
- **User Profile** → **Notification Rules**
- Configure: Phone, SMS, Email, Push
- Set delays (e.g., SMS after 5 minutes if not acknowledged)

### 2. Escalation Policies

**Services** → **Escalation Policies**
```
Level 1: DevOps Team (5 minutes)
Level 2: Senior Engineer (10 minutes)
Level 3: Manager (15 minutes)
```

### 3. On-Call Schedules

**People** → **On-Call Schedules**
- Create rotation schedule
- Assign team members
- Set timezone

### 4. Incident Response

When you receive an alert:
1. **Acknowledge** - Stops escalation, you're working on it
2. **Resolve** - Issue is fixed (or alert auto-resolves)
3. **Reassign** - Pass to another team member
4. **Add Note** - Document what you're doing

## 🔄 Alert Lifecycle in PagerDuty

```
1. Alert Fires in Prometheus
   ↓
2. AlertManager sends to PagerDuty
   ↓
3. PagerDuty creates Incident (State: Triggered)
   ↓
4. Notifications sent (Email, SMS, Phone)
   ↓
5. Engineer Acknowledges (State: Acknowledged)
   ↓
6. Alert resolves in Prometheus
   ↓
7. AlertManager updates PagerDuty
   ↓
8. Incident auto-resolves (State: Resolved)
```

## ⚠️ Important Notes

### Alert Deduplication

PagerDuty automatically deduplicates alerts with the same:
- `dedup_key` (generated from alert labels)
- Within the same service

Multiple firings of the same alert update the **same incident**.

### Resolution Behavior

- When Prometheus alert resolves → AlertManager notifies PagerDuty
- PagerDuty automatically resolves the incident
- Timeline shows full incident history

### Rate Limiting

Be careful with:
- Too many alerts → Can hit PagerDuty rate limits
- Flapping alerts → Consider using `for:` duration in Prometheus rules

## 🐛 Troubleshooting

### No incidents in PagerDuty

```bash
# 1. Check AlertManager logs
kubectl logs -n monitoring alertmanager-kube-prometheus-stack-alertmanager-0 | grep -i "pagerduty\|error"

# 2. Check secret exists
kubectl get secret alertmanager-pagerduty-key -n monitoring

# 3. Verify integration key
kubectl get secret alertmanager-pagerduty-key -n monitoring -o jsonpath='{.data.integration-key}' | base64 -d
echo ""

# 4. Check AlertManager config
kubectl get configmap -n monitoring alertmanager-kube-prometheus-stack-alertmanager-generated -o yaml
```

### Incidents not resolving

Check:
1. AlertManager `resolve_timeout` (currently 5m)
2. Prometheus alert `for:` duration
3. PagerDuty integration settings

### Too many incidents

Solution:
1. Increase `group_interval` and `repeat_interval`
2. Add more specific routing rules
3. Tune Prometheus alert thresholds

## 📖 Additional Resources

- [PagerDuty Events API v2](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgw-events-api-v2-overview)
- [AlertManager PagerDuty Config](https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config)
- [PagerDuty Best Practices](https://support.pagerduty.com/docs/incident-response-docs)

## 🔙 Rollback to Slack

If you need to switch back to Slack:

```bash
# Restore from git history
git log --oneline -- clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml
git checkout <commit-hash> -- clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml

# Or manually reconfigure Slack receiver
```

## 💰 Pricing Note

- **PagerDuty Free** - Limited features, 10 services
- **Professional** - $21/user/month - Full features
- **Business** - $41/user/month - Advanced features

Consider starting with the free tier for testing!
