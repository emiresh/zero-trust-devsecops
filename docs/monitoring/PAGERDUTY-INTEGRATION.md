# PagerDuty Integration Guide

## Overview

Your setup has **two separate PagerDuty services** for different alert sources:

| Service | ID | Purpose | Triggered By |
|---------|----|---------|--------------| 
| **FreshBonds Application** | PRZZM0D | Application errors | Your Node.js code |
| **Kubernetes Infrastructure** | PKIUIBN | Infrastructure alerts | Prometheus/Alertmanager |

---

## 1. Infrastructure Alerts (Already Configured ✅)

**Prometheus → Alertmanager → PagerDuty (PKIUIBN)**

### What Triggers:
- Pod crashes
- High CPU/Memory
- Node issues
- Falco security violations
- Prometheus rule violations

### Configuration:
Already configured in `clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml`

Alertmanager automatically uses the `alertmanager-pagerduty-key` secret which contains the **infrastructure service key (PKIUIBN)**.

**No code changes needed** - works automatically!

---

## 2. Application Alerts (Needs Code Integration)

**Your Node.js App → PagerDuty (PRZZM0D)**

### Setup Steps:

#### Step 1: Install PagerDuty Client

```bash
cd src/user-service
npm install @pagerduty/pdjs

cd ../product-service  
npm install @pagerduty/pdjs

cd ../api-gateway
npm install @pagerduty/pdjs
```

#### Step 2: Create PagerDuty Helper

Create `src/user-service/utils/pagerduty.js`:

```javascript
const { event } = require('@pagerduty/pdjs');

const PAGERDUTY_KEY = process.env.PAGERDUTY_INTEGRATION_KEY;

/**
 * Send an alert to PagerDuty
 * @param {string} summary - Short description
 * @param {string} severity - 'critical', 'error', 'warning', 'info'
 * @param {object} customDetails - Additional context
 */
async function sendAlert(summary, severity = 'error', customDetails = {}) {
  if (!PAGERDUTY_KEY) {
    console.warn('⚠️ PAGERDUTY_INTEGRATION_KEY not configured - skipping PagerDuty alert');
    return;
  }

  try {
    const payload = {
      routing_key: PAGERDUTY_KEY,
      event_action: 'trigger',
      payload: {
        summary: summary,
        severity: severity,
        source: process.env.HOSTNAME || 'user-service',
        custom_details: {
          environment: process.env.NODE_ENV || 'production',
          service: 'user-service',
          ...customDetails
        }
      }
    };

    const response = await event(payload);
    console.log(`📟 PagerDuty alert sent: ${summary} (${severity})`);
    return response;
  } catch (error) {
    console.error('❌ Failed to send PagerDuty alert:', error.message);
  }
}

/**
 * Resolve an existing PagerDuty incident
 * @param {string} dedupKey - Deduplication key from original alert
 */
async function resolveAlert(dedupKey) {
  if (!PAGERDUTY_KEY) return;

  try {
    await event({
      routing_key: PAGERDUTY_KEY,
      event_action: 'resolve',
      dedup_key: dedupKey
    });
    console.log(`✅ PagerDuty alert resolved: ${dedupKey}`);
  } catch (error) {
    console.error('❌ Failed to resolve PagerDuty alert:', error.message);
  }
}

module.exports = { sendAlert, resolveAlert };
```

#### Step 3: Use in Your Code

**Example 1: Payment Processing Error**

```javascript
const { sendAlert } = require('./utils/pagerduty');

// In api-gateway/server.js
app.post('/api/payment', async (req, res) => {
  try {
    const result = await processPayment(req.body);
    res.json(result);
  } catch (error) {
    console.error('Payment processing failed:', error);
    
    // Send critical alert to PagerDuty
    await sendAlert(
      `Payment processing failed: ${error.message}`,
      'critical',
      {
        user_id: req.user.id,
        amount: req.body.amount,
        error: error.stack
      }
    );
    
    res.status(500).json({ error: 'Payment failed' });
  }
});
```

**Example 2: Database Connection Loss**

```javascript
const { sendAlert } = require('./utils/pagerduty');

// In user-service/server.js
mongoose.connection.on('disconnected', async () => {
  console.error('❌ MongoDB disconnected!');
  
  await sendAlert(
    'User Service: MongoDB connection lost',
    'critical',
    {
      database: 'freshbonds',
      service: 'user-service',
      timestamp: new Date().toISOString()
    }
  );
});

mongoose.connection.on('reconnected', async () => {
  console.log('✅ MongoDB reconnected');
  // Optionally resolve the alert if you tracked the dedup_key
});
```

**Example 3: High Error Rate**

```javascript
const { sendAlert } = require('./utils/pagerduty');

let errorCount = 0;
const ERROR_THRESHOLD = 10;
const WINDOW_MS = 60000; // 1 minute

// Error tracking middleware
app.use((err, req, res, next) => {
  errorCount++;
  
  if (errorCount >= ERROR_THRESHOLD) {
    sendAlert(
      `High error rate detected: ${errorCount} errors in 1 minute`,
      'warning',
      {
        error_count: errorCount,
        last_error: err.message
      }
    );
    errorCount = 0; // Reset counter
  }
  
  next(err);
});

// Reset counter every minute
setInterval(() => { errorCount = 0; }, WINDOW_MS);
```

---

## Testing

### Test Infrastructure Alerts (Prometheus/Alertmanager)

```bash
# Trigger a test alert from Prometheus
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090

# Go to http://localhost:9090/alerts
# Fire a test alert or wait for a real one
```

### Test Application Alerts (Your Code)

```javascript
// Add a test endpoint (remove in production!)
app.get('/test-pagerduty', async (req, res) => {
  const { sendAlert } = require('./utils/pagerduty');
  
  await sendAlert(
    'Test alert from FreshBonds application',
    'info',
    { test: true, triggered_by: 'manual' }
  );
  
  res.json({ message: 'PagerDuty test alert sent' });
});
```

Then:
```bash
curl https://freshbonds.com/test-pagerduty
```

Check your PagerDuty dashboard - you should see:
- **PRZZM0D (FreshBonds Application)** - Test alert from your code
- **PKIUIBN (Kubernetes Infrastructure)** - Prometheus/Falco alerts

---

## Summary

✅ **Infrastructure alerts** → Already working via Alertmanager  
⚠️ **Application alerts** → Need to add `@pagerduty/pdjs` and integrate in code

**After integration, both PagerDuty services will receive appropriate alerts automatically!**
