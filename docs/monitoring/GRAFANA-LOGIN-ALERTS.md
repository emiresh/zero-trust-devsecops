# Grafana Login Failure Alert Configuration

This guide shows how to configure Grafana alerts for failed login attempts using the Loki logging stack.

## Prerequisites

1. **Loki + Promtail** deployed (already done ✅)
2. **Grafana** accessible via port-forward
3. **Application code** updated with structured logging (already done ✅)

## Access Grafana

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

Open: http://localhost:3000  
Login: `admin` / `admin123`

## Step 1: Add Loki Data Source

1. Go to **Configuration** → **Data Sources** → **Add data source**
2. Select **Loki**
3. Configure:
   - **Name**: `Loki`
   - **URL**: `http://loki-stack.monitoring.svc.cluster.local:3100`
4. Click **Save & Test**

## Step 2: Create Login Failure Alert Rules

### Alert Rule 1: High Failed Login Rate (Brute Force Detection)

**Configuration:**
- Name: `High Failed Login Rate - Brute Force Attack`
- Folder: `FreshBonds Application Alerts`
- Evaluation interval: `1m`
- For: `5m`

**Query A (LogQL):**
```logql
sum(count_over_time({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_FAILED" [1m]))
```

**Threshold:**
- Condition: `WHEN last() OF A IS ABOVE 10`
- Description: "More than 10 failed login attempts in 1 minute detected"

**Alert Details:**
- Summary: `🚨 Possible brute force attack detected - {{ $value }} failed login attempts in 1 minute`
- Description: `High rate of failed login attempts detected. This may indicate a brute force attack.`
- Severity: `critical`

**Contact Point:** `pagerduty-freshbonds-app` (PRZZM0D service)

---

### Alert Rule 2: Repeated Failed Logins for Same Email

**Configuration:**
- Name: `Repeated Failed Login Attempts - Single User`
- Folder: `FreshBonds Application Alerts`
- Evaluation interval: `1m`
- For: `2m`

**Query A (LogQL):**
```logql
sum by (email) (count_over_time({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_FAILED" [5m]))
```

**Threshold:**
- Condition: `WHEN last() OF A IS ABOVE 5`
- Description: "Single email has 5+ failed login attempts in 5 minutes"

**Alert Details:**
- Summary: `⚠️ Multiple failed login attempts for email: {{ $labels.email }} ({{ $value }} attempts)`
- Description: `User {{ $labels.email }} has failed to login {{ $value }} times in the last 5 minutes. This may indicate:\n- User forgot password\n- Account compromise attempt\n- Credential stuffing attack`
- Severity: `warning`

**Contact Point:** `pagerduty-freshbonds-app` (PRZZM0D service)

---

### Alert Rule 3: Failed Login from New Location/IP

**Configuration:**
- Name: `Failed Login from Suspicious IP`
- Folder: `FreshBonds Application Alerts`
- Evaluation interval: `1m`
- For: `1m`

**Query A (LogQL):**
```logql
sum by (ip, email) (count_over_time({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_FAILED" 
  | reason="INVALID_PASSWORD" [2m]))
```

**Threshold:**
- Condition: `WHEN last() OF A IS ABOVE 3`
- Description: "3+ password failures from same IP for same email"

**Alert Details:**
- Summary: `🔐 Password attack detected - IP: {{ $labels.ip }}, Email: {{ $labels.email }}`
- Description: `Failed login attempts from IP {{ $labels.ip }} for user {{ $labels.email }}. May indicate targeted attack.`
- Severity: `warning`

**Contact Point:** `pagerduty-freshbonds-app` (PRZZM0D service)

---

### Alert Rule 4: User Not Found Attempts (Email Enumeration)

**Configuration:**
- Name: `Email Enumeration Attack Detected`
- Folder: `FreshBonds Application Alerts`
- Evaluation interval: `1m`
- For: `3m`

**Query A (LogQL):**
```logql
sum(count_over_time({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_FAILED" 
  | reason="USER_NOT_FOUND" [1m]))
```

**Threshold:**
- Condition: `WHEN last() OF A IS ABOVE 20`
- Description: "More than 20 login attempts with non-existent emails"

**Alert Details:**
- Summary: `🕵️ Email enumeration attack - {{ $value }} attempts with invalid emails`
- Description: `High rate of login attempts with non-existent email addresses. This indicates:\n- Email enumeration attack\n- Automated scanning\n- Potential reconnaissance`
- Severity: `warning`

**Contact Point:** `pagerduty-freshbonds-app` (PRZZM0D service)

---

## Step 3: Create PagerDuty Contact Point

1. Go to **Alerting** → **Contact points** → **New contact point**
2. Configure:
   - **Name**: `pagerduty-freshbonds-app`
   - **Integration**: `PagerDuty`
   - **Integration Key**: Get from secret:
     ```bash
     kubectl get secret -n dev freshbonds-secret \
       -o jsonpath='{.data.PAGERDUTY_INTEGRATION_KEY}' | base64 -d
     ```
   - **Severity**: Map based on alert labels
3. Click **Save contact point**

## Step 4: Test the Alert

### Method 1: Make Failed Login Attempts

```bash
# Attempt 1: Wrong email
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@test.com", "password": "wrongpass"}'

# Attempt 2: Wrong password
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@user.com", "password": "wrongpassword"}'

# Repeat 10+ times to trigger alert
for i in {1..15}; do
  curl -X POST http://localhost:3001/api/users/login \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"test$i@fake.com\", \"password\": \"wrong\"}"
  sleep 1
done
```

### Method 2: View Logs in Grafana Explore

1. Go to **Explore** in Grafana
2. Select **Loki** data source
3. Query:
   ```logql
   {namespace="dev", app="user-service"} | json | event="LOGIN_FAILED"
   ```
4. You should see structured JSON logs with:
   - `event`: LOGIN_FAILED
   - `reason`: USER_NOT_FOUND or INVALID_PASSWORD
   - `email`: attempted email
   - `ip`: source IP
   - `timestamp`: when it happened

## Step 5: Monitor in PagerDuty

1. Go to PagerDuty dashboard
2. Check **FreshBonds Application** service (PRZZM0D)
3. Failed login alerts will appear with:
   - Alert severity
   - Number of attempts
   - Email addresses involved
   - Timestamp

## Log Structure Reference

### Failed Login (User Not Found)
```json
{
  "level": "ERROR",
  "event": "LOGIN_FAILED",
  "reason": "USER_NOT_FOUND",
  "email": "test@example.com",
  "timestamp": "2025-11-23T18:00:00.000Z",
  "ip": "10.244.1.5",
  "userAgent": "Mozilla/5.0..."
}
```

### Failed Login (Invalid Password)
```json
{
  "level": "ERROR",
  "event": "LOGIN_FAILED",
  "reason": "INVALID_PASSWORD",
  "email": "user@example.com",
  "userId": "507f1f77bcf86cd799439011",
  "timestamp": "2025-11-23T18:00:00.000Z",
  "ip": "10.244.1.5",
  "userAgent": "Mozilla/5.0..."
}
```

### Successful Login
```json
{
  "level": "INFO",
  "event": "LOGIN_SUCCESS",
  "email": "user@example.com",
  "userId": "507f1f77bcf86cd799439011",
  "role": "user",
  "timestamp": "2025-11-23T18:00:00.000Z",
  "ip": "10.244.1.5",
  "userAgent": "Mozilla/5.0..."
}
```

## Additional Security Measures

### 1. Rate Limiting (Already Implemented)
The login endpoint has rate limiting:
- **10 attempts per 15 minutes** per IP

### 2. Account Lockout (Optional Enhancement)
Add temporary account lockout after 5 failed attempts:

```javascript
// Track failed attempts in MongoDB
if (failedAttempts >= 5) {
  user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
  await user.save();
}
```

### 3. CAPTCHA (Optional Enhancement)
Add CAPTCHA after 3 failed attempts to prevent automated attacks.

### 4. Two-Factor Authentication (Optional)
Implement 2FA for additional security layer.

## Useful LogQL Queries

### View all login events (success + failure)
```logql
{namespace="dev", app="user-service"} 
  | json 
  | event=~"LOGIN_.*"
```

### Failed logins grouped by reason
```logql
sum by (reason) (count_over_time({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_FAILED" [1h]))
```

### Success rate over time
```logql
sum(rate({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_SUCCESS" [5m]))
/ 
sum(rate({namespace="dev", app="user-service"} 
  | json 
  | event=~"LOGIN_.*" [5m]))
```

### Top 10 IPs with failed logins
```logql
topk(10, sum by (ip) (count_over_time({namespace="dev", app="user-service"} 
  | json 
  | event="LOGIN_FAILED" [24h])))
```

## Troubleshooting

### Alert not firing?
1. Check logs are reaching Loki:
   ```bash
   kubectl logs -n monitoring -l app.kubernetes.io/name=promtail --tail=50
   ```

2. Verify JSON parsing in Grafana Explore:
   ```logql
   {namespace="dev", app="user-service"} | json
   ```

3. Check alert evaluation:
   - Go to **Alerting** → **Alert rules**
   - Check **State** and **Last evaluation**

### No logs appearing?
1. Restart user-service pods to apply code changes:
   ```bash
   kubectl rollout restart deployment/user-service -n dev
   ```

2. Verify pods are running:
   ```bash
   kubectl get pods -n dev -l app=user-service
   ```

---

**Your login failure alerting is now configured!** 🎉

Any failed login attempt will:
1. Be logged in structured JSON format
2. Be collected by Promtail
3. Be stored in Loki
4. Trigger Grafana alerts based on thresholds
5. Send alerts to PagerDuty service PRZZM0D
