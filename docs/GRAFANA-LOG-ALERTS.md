# Grafana Alert Rules for FreshBonds Application Logs

## How to Configure in Grafana UI:

1. **Access Grafana**
   ```bash
   kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
   ```
   Open: http://localhost:3000
   Login: admin / prom-operator (default)

2. **Add Loki Data Source**
   - Configuration → Data Sources → Add data source
   - Select "Loki"
   - URL: `http://loki:3100`
   - Click "Save & Test"

3. **Create Alert Rules**
   - Alerting → Alert rules → New alert rule

---

## Alert Rule 1: High Error Rate

**Name:** `FreshBonds - High Error Rate`

**Query A (Loki):**
```logql
sum(rate({namespace="dev", app=~"apigateway|user-service|product-service"} 
  |~ "ERROR|error|Error" [5m]))
```

**Threshold:** 
- Warning: > 5 errors/sec
- Critical: > 10 errors/sec

**Labels:**
```yaml
severity: warning
team: backend
service: freshbonds
alert_type: application
```

**Annotations:**
```yaml
summary: High error rate detected in FreshBonds services
description: {{ $value }} errors per second in the last 5 minutes
```

**Route to:** pagerduty-notifications (PRZZM0D service)

---

## Alert Rule 2: MongoDB Connection Failures

**Name:** `FreshBonds - MongoDB Connection Lost`

**Query A (Loki):**
```logql
count_over_time({namespace="dev", app=~"user-service|product-service"} 
  |~ "MongoDB.*disconnect|MongoDB connection.*lost|MongoParseError" [1m])
```

**Threshold:**
- Critical: > 0 occurrences

**Labels:**
```yaml
severity: critical
team: backend
service: freshbonds
component: database
alert_type: application
```

**Annotations:**
```yaml
summary: MongoDB connection issue detected
description: Service {{ $labels.app }} lost database connection
```

**Route to:** pagerduty-critical (PRZZM0D service)

---

## Alert Rule 3: Payment Processing Failures

**Name:** `FreshBonds - Payment Failures`

**Query A (Loki):**
```logql
sum(rate({namespace="dev", app="apigateway"} 
  |~ "payment.*fail|IPG.*error|transaction.*error" [10m]))
```

**Threshold:**
- Warning: > 1 failure per minute
- Critical: > 5 failures per minute

**Labels:**
```yaml
severity: critical
team: payments
service: freshbonds
component: payment-gateway
alert_type: application
```

**Annotations:**
```yaml
summary: Payment processing failures detected
description: {{ $value }} payment failures per second
```

**Route to:** pagerduty-critical (PRZZM0D service)

---

## Alert Rule 4: Authentication Failures Spike

**Name:** `FreshBonds - High Auth Failure Rate`

**Query A (Loki):**
```logql
sum(rate({namespace="dev", app="user-service"} 
  |~ "authentication.*failed|invalid.*token|unauthorized" [5m]))
```

**Threshold:**
- Warning: > 10 failures per minute

**Labels:**
```yaml
severity: warning
team: security
service: freshbonds
component: authentication
alert_type: application
```

**Annotations:**
```yaml
summary: Unusual authentication failure rate
description: Possible brute force attack or integration issue
```

**Route to:** pagerduty-notifications (PRZZM0D service)

---

## Alert Rule 5: Pod Crash Loop

**Name:** `FreshBonds - Pod Restart Loop`

**Query A (Loki):**
```logql
count_over_time({namespace="dev", app=~"apigateway|user-service|product-service"} 
  |~ "Error.*exit|Fatal.*crash|SIGTERM|SIGKILL" [5m])
```

**Threshold:**
- Critical: > 3 occurrences in 5 minutes

**Labels:**
```yaml
severity: critical
team: sre
service: freshbonds
alert_type: application
```

**Annotations:**
```yaml
summary: Pod {{ $labels.pod }} is crash looping
description: Detected {{ $value }} crashes in 5 minutes
```

**Route to:** pagerduty-critical (PRZZM0D service)

---

## Configure Alertmanager Contact Point

In Grafana:
1. **Alerting → Contact points → New contact point**

2. **Name:** `pagerduty-freshbonds-app`

3. **Integration:** PagerDuty

4. **Integration Key:** Use the secret from Kubernetes
   ```bash
   kubectl get secret freshbonds-secret -n dev \
     -o jsonpath='{.data.PAGERDUTY_INTEGRATION_KEY}' | base64 -d
   ```

5. **Severity:** 
   - Map Grafana severity to PagerDuty severity
   - `alertname` → Custom event

6. **Save contact point**

---

## Configure Notification Policy

1. **Alerting → Notification policies**

2. **Add policy:**
   ```yaml
   Match labels:
     alert_type: application
     service: freshbonds
   
   Contact point: pagerduty-freshbonds-app
   
   Group by: ['alertname', 'namespace', 'app']
   Group interval: 5m
   Repeat interval: 4h
   ```

3. **Save**

---

## Testing

### Test Query in Explore:

```logql
# View all FreshBonds errors
{namespace="dev", app=~"apigateway|user-service|product-service"} 
  |~ "ERROR|error"

# Count errors per service
sum by(app) (count_over_time({namespace="dev"} |~ "ERROR" [5m]))

# MongoDB connection issues
{namespace="dev"} |~ "MongoDB.*disconnect"
```

### Trigger Test Alert:

Generate errors in your application to test alerts:

```bash
# Option 1: Make failed requests
for i in {1..20}; do
  curl -X POST https://freshbonds.com/api/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrong"}'
done

# Option 2: Cause a MongoDB disconnect (restart pod)
kubectl delete pod -n dev -l app=user-service

# Check Grafana Alerting tab to see if alert fired
```

---

## Benefits of This Approach

✅ **Zero code changes** - Apps just log to stdout  
✅ **Centralized logging** - All logs in one place (Loki)  
✅ **Powerful queries** - LogQL for complex patterns  
✅ **Visual dashboards** - See logs + metrics together  
✅ **Dynamic alerts** - Change rules without deploying code  
✅ **Unified alerting** - Same path as infrastructure alerts  
✅ **Historical analysis** - Query past logs for debugging  
✅ **Cost effective** - No external log service needed  

This is the **industry-standard** approach used by Netflix, Uber, Spotify, etc. 🎯
