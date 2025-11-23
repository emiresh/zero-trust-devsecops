# Grafana Application Error Alerting Guide

Complete guide for creating application error alerts using Loki + Grafana that send to PagerDuty.

## Overview

**Alert Flow:**
```
Application Logs → Promtail → Loki → Grafana Alert Rules → PagerDuty (PRZZM0D)
```

**PagerDuty Service:**
- **Service ID:** PRZZM0D (Application alerts)
- **Integration Key:** From `freshbonds-secret` in dev namespace
- **Receives:** Application errors, crashes, login failures, payment issues

---

## Prerequisites

1. **Loki stack running** - logs being collected
2. **PagerDuty key available** - get from secret:
   ```bash
   kubectl get secret -n dev freshbonds-secret -o jsonpath='{.data.PAGERDUTY_INTEGRATION_KEY}' | base64 -d
   ```

---

## Step 1: Access Grafana

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

Open: http://localhost:3000
Login: `admin` / `admin123`

---

## Step 2: Create PagerDuty Contact Point

1. Go to: **Alerting** → **Contact points**
2. Click: **New contact point**
3. Configure:
   - **Name:** `pagerduty-freshbonds-app`
   - **Integration:** PagerDuty
   - **Integration Key:** Paste the key from `freshbonds-secret`
   - **Severity:** Critical
   - **Class:** Application Error
   - **Component:** FreshBonds
   - **Group:** Production

4. Click: **Test** → Should show "Test alert sent successfully"
5. Click: **Save contact point**

---

## Step 3: Create Alert Rules

### Alert 1: Application Error Rate

**When to fire:** More than 10 errors per minute

1. Go to: **Alerting** → **Alert rules** → **New alert rule**
2. **Set query and alert condition:**
   - **Query A:**
     ```logql
     sum(rate({namespace="dev"} |= "ERROR" [1m]))
     ```
   - **Threshold:** `> 10`
   - **For:** 2m

3. **Set alert evaluation behavior:**
   - **Folder:** Application Alerts
   - **Evaluation group:** Production
   - **Evaluation interval:** 1m

4. **Add details:**
   - **Alert name:** `Application Error Rate High`
   - **Summary:** `High error rate detected in production`
   - **Description:** `{{ $value }} errors/second detected in dev namespace`
   - **Labels:**
     - `severity: critical`
     - `component: application`
     - `namespace: dev`

5. **Configure notifications:**
   - **Contact point:** `pagerduty-freshbonds-app`

6. Click: **Save rule and exit**

---

### Alert 2: Service Crash Detection

**When to fire:** Service restarts detected

1. **New alert rule:**
   - **Query A:**
     ```logql
     count_over_time({namespace="dev"} |= "panic" or |= "fatal" or |= "crash" [5m])
     ```
   - **Threshold:** `> 0`
   - **For:** 1m

2. **Details:**
   - **Alert name:** `Service Crash Detected`
   - **Summary:** `Application crash or panic detected`
   - **Description:** `Fatal error detected in logs: {{ $labels.app }}`
   - **Labels:**
     - `severity: critical`
     - `component: {{ $labels.app }}`

3. **Notifications:** `pagerduty-freshbonds-app`

---

### Alert 3: Database Connection Errors

**When to fire:** MongoDB connection issues

1. **New alert rule:**
   - **Query A:**
     ```logql
     sum(count_over_time({namespace="dev"} |= "MongoDB" |= "connection" |= "failed" [5m]))
     ```
   - **Threshold:** `> 3`
   - **For:** 2m

2. **Details:**
   - **Alert name:** `Database Connection Failures`
   - **Summary:** `MongoDB connection issues detected`
   - **Description:** `{{ $value }} database connection failures in 5 minutes`
   - **Labels:**
     - `severity: warning`
     - `component: database`

3. **Notifications:** `pagerduty-freshbonds-app`

---

### Alert 4: API Gateway 5xx Errors

**When to fire:** Backend errors from API gateway

1. **New alert rule:**
   - **Query A:**
     ```logql
     sum(rate({namespace="dev", app="api-gateway"} | json | status >= 500 [2m]))
     ```
   - **Threshold:** `> 5`
   - **For:** 2m

2. **Details:**
   - **Alert name:** `API Gateway 5xx Error Rate`
   - **Summary:** `High rate of server errors from API gateway`
   - **Description:** `{{ $value }} 5xx errors/second from API gateway`
   - **Labels:**
     - `severity: critical`
     - `component: api-gateway`

3. **Notifications:** `pagerduty-freshbonds-app`

---

### Alert 5: Payment Processing Errors

**When to fire:** Payment failures detected

1. **New alert rule:**
   - **Query A:**
     ```logql
     sum(count_over_time({namespace="dev"} |= "payment" |= "failed" [10m]))
     ```
   - **Threshold:** `> 5`
   - **For:** 2m

2. **Details:**
   - **Alert name:** `Payment Processing Failures`
   - **Summary:** `Payment failures detected`
   - **Description:** `{{ $value }} payment failures in 10 minutes`
   - **Labels:**
     - `severity: critical`
     - `component: payment`

3. **Notifications:** `pagerduty-freshbonds-app`

---

## Step 4: Test Alerts

### Generate Test Errors

**Option 1: Send error logs to user-service**
```bash
kubectl exec -n dev deployment/user-service -- sh -c 'echo "{\"level\":\"error\",\"message\":\"Test error for alerting\"}" >&2'
```

**Option 2: Simulate crash**
```bash
kubectl exec -n dev deployment/user-service -- sh -c 'echo "{\"level\":\"fatal\",\"message\":\"Test panic\"}" >&2'
```

**Option 3: Check error rate in Grafana Explore**
```logql
sum(rate({namespace="dev"} |= "ERROR" [1m]))
```

### Verify Alert Firing

1. Go to: **Alerting** → **Alert rules**
2. Wait 2-3 minutes for evaluation
3. Check status: Should show "Firing" if threshold exceeded
4. Check PagerDuty: Should receive incident

---

## Common LogQL Queries for Application Monitoring

### All Errors
```logql
{namespace="dev"} |= "ERROR"
```

### Fatal/Crash Events
```logql
{namespace="dev"} |~ "(?i)(panic|fatal|crash)"
```

### Database Errors
```logql
{namespace="dev"} |~ "(?i)(mongodb|database)" |= "error"
```

### HTTP 5xx Errors (if using JSON logging)
```logql
{namespace="dev"} | json | status >= 500
```

### Slow Queries (>1 second)
```logql
{namespace="dev"} | json | duration > 1000
```

### Authentication Failures
```logql
{namespace="dev"} |= "authentication" |= "failed"
```

---

## Alert Rule Best Practices

### 1. Set Appropriate Thresholds
- **Errors:** > 10/min for critical, > 5/min for warning
- **Crashes:** Any occurrence = critical
- **DB Issues:** > 3 failures in 5min
- **5xx errors:** > 5/sec = critical

### 2. Use Proper Evaluation Windows
- **Fast detection:** 1-2 minute windows for critical issues
- **Reduce noise:** Longer windows (5-10 min) for non-critical

### 3. Add Context in Descriptions
```
{{ $value }} errors/second in {{ $labels.namespace }}/{{ $labels.app }}
```

### 4. Group Related Alerts
- Create folders: "Application Alerts", "Database Alerts", "Security Alerts"
- Use evaluation groups: "Production", "Critical", "Warning"

### 5. Test Before Production
- Use test queries in Explore first
- Verify LogQL returns expected results
- Test contact point sends to PagerDuty

---

## Troubleshooting

### Alert Not Firing

**Check Loki has logs:**
```bash
# Port-forward Loki
kubectl port-forward -n monitoring svc/loki-stack 3100:3100

# Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={namespace="dev"}' | jq
```

**Check alert rule state:**
- Go to Alerting → Alert rules
- Click on rule → View query
- Check "Last evaluated" timestamp
- Verify threshold and duration

### PagerDuty Not Receiving Alerts

**Verify contact point:**
- Go to Contact points → pagerduty-freshbonds-app
- Click "Test" → Should succeed
- Check integration key matches secret

**Check notification policy:**
- Go to Alerting → Notification policies
- Verify rules route to correct contact point
- Check for any silences

### Wrong Logs in Results

**Add more filters:**
```logql
# Before
{namespace="dev"} |= "ERROR"

# After - more specific
{namespace="dev", app="user-service"} |= "ERROR" != "health check"
```

---

## Maintenance

### When PagerDuty Key Rotates

The key in the contact point will **NOT auto-update**. After rotation:

1. Get new key:
   ```bash
   kubectl get secret -n dev freshbonds-secret -o jsonpath='{.data.PAGERDUTY_INTEGRATION_KEY}' | base64 -d
   ```

2. Update contact point:
   - Go to: Alerting → Contact points
   - Edit: pagerduty-freshbonds-app
   - Update: Integration Key
   - Click: Save

**Automation option:** Add this to rotation workflow to update via Grafana API.

---

## Summary

**Alert Rules Created:**
1. ✅ Application Error Rate High (>10/min)
2. ✅ Service Crash Detected (fatal/panic)
3. ✅ Database Connection Failures (>3 in 5min)
4. ✅ API Gateway 5xx Errors (>5/sec)
5. ✅ Payment Processing Failures (>5 in 10min)

**PagerDuty Integration:**
- Service: PRZZM0D (Application)
- Contact Point: pagerduty-freshbonds-app
- All application errors route to this service

**Next Steps:**
1. Create alert rules in Grafana UI
2. Test each alert with simulated errors
3. Verify PagerDuty receives incidents
4. Adjust thresholds based on actual traffic
5. Add more specific rules for your application
