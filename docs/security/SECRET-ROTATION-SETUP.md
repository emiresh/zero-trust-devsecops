# Secret Rotation Setup Guide

## Overview
The automated secret rotation pipeline now **actually rotates credentials** on external services (MongoDB Atlas, PagerDuty) using their APIs, not just updating Kubernetes secrets.

## 🔐 What Gets Rotated

### ✅ Automatically Rotated
| Secret Type | Rotation Method | Frequency |
|------------|----------------|-----------|
| **JWT_SECRET** | Internal generation | Bi-weekly (production) / Weekly (JWT-only) |
| **IPG_CALLBACK_TOKEN** | Internal generation | Bi-weekly |
| **MongoDB Password** | MongoDB Atlas API | Bi-weekly (if API key configured) |
| **PagerDuty Integration Key** | PagerDuty API | Bi-weekly (if API key configured) |

### ⏭️ Not Rotated (Static Configuration)
- `IPG_APP_NAME`, `IPG_APP_ID`, `IPG_APP_TOKEN`, `IPG_HASH_SALT` - Payment gateway credentials (rotate manually)
- `NODE_ENV` - Environment variable

---

## 📋 Required GitHub Secrets

### Already Configured
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions
- `KUBECONFIG` - Kubernetes cluster access (base64 encoded)
- `IPG_APP_NAME`, `IPG_APP_ID`, `IPG_APP_TOKEN`, `IPG_HASH_SALT`, `IPG_CALLBACK_URL` - Payment gateway

### 🆕 Add These for Full Rotation

#### 1. MongoDB Connection Components
```bash
# Store STATIC connection details only (no passwords!)
# The workflow generates new passwords on each rotation

Name: MONGO_HOST
Value: dev.qzhiudx.mongodb.net

Name: MONGO_DATABASE
Value: freshbonds

Name: MONGO_USERNAME
Value: admin

# ✅ No MONGO_PASSWORD needed - generated fresh each rotation!
```

#### 2. MongoDB Atlas API Credentials
```bash
# Step 1: Get your MongoDB Atlas Project ID
# Go to: https://cloud.mongodb.com
# Select your project → Settings
# Copy the "Project ID" (e.g., 507f1f77bcf86cd799439011)

Name: MONGO_PROJECT_ID
Value: 507f1f77bcf86cd799439011

# Step 2: Create API Key
# Organization Settings → Access Manager → API Keys → Create API Key
# Permissions: "Project Owner" or "Organization Owner"
# Copy the Public Key and Private Key

# Format: PUBLIC_KEY:PRIVATE_KEY
Name: MONGO_API_KEY
Value: abcdefgh:ijklmnop-qrstuvwxyz-1234567890
#       ↑ public  ↑ private key
```

#### 3. PagerDuty API Token
```bash
# Create API token in PagerDuty:
# 1. Go to https://yourcompany.pagerduty.com
# 2. Integrations → API Access Keys → Create New API Key
# 3. Name: "GitHub Actions Secret Rotation"
# 4. Description: "Automated secret rotation workflow"
# 5. Copy the token

# Add to GitHub
Name: PAGERDUTY_API_KEY
Value: u+your_token_here_abc123xyz
```

#### 4. PagerDuty Service IDs (Two Separate Services)
```bash
# Create two PagerDuty services for separation of concerns:

# Service 1: FreshBonds Application
# - Purpose: Application-level errors (payment failures, exceptions)
# - Used by: user-service, product-service, api-gateway
# 1. Go to Services → Create New Service
# 2. Name: "FreshBonds Application"
# 3. Copy Service ID from URL (e.g., PRZZM0D)

Name: PAGERDUTY_SERVICE_ID_APP
Value: PRZZM0D

# Service 2: Kubernetes Infrastructure
# - Purpose: Infrastructure monitoring (pod crashes, Falco alerts)
# - Used by: Prometheus, Alertmanager, Falco
# 1. Go to Services → Create New Service
# 2. Name: "Kubernetes Infrastructure"
# 3. Copy Service ID from URL (e.g., PKIUIBN)

Name: PAGERDUTY_SERVICE_ID_INFRA
Value: PKIUIBN
```

---

## 🚀 How It Works

### Pipeline Flow

```
┌─────────────────────────────────────────┐
│  Trigger (Scheduled or Manual)         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  1. Rotate MongoDB Password             │
│     ├─ Call MongoDB Atlas API           │
│     ├─ Generate new secure password     │
│     ├─ Update user password on Atlas    │
│     └─ Build new connection URI         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  2. Rotate PagerDuty Integration Key    │
│     ├─ Call PagerDuty API               │
│     ├─ Create new integration           │
│     └─ Get new integration key          │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  3. Generate Internal Secrets           │
│     ├─ JWT_SECRET (32 chars)            │
│     └─ IPG_CALLBACK_TOKEN (32 chars)    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  4. Create SealedSecret                 │
│     ├─ Combine all new secrets          │
│     ├─ Encrypt with kubeseal            │
│     └─ Save to apps/.../sealed-secret   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  5. Commit to Repository                │
│     ├─ Backup old secrets               │
│     ├─ Update rotation log              │
│     └─ Push to main [skip ci]           │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  6. ArgoCD Auto-Sync                    │
│     ├─ Detects new SealedSecret         │
│     ├─ SealedSecrets controller decrypts│
│     └─ Creates K8s Secret               │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  7. Rolling Restart Applications        │
│     ├─ freshbonds                       │
│     ├─ api-gateway                      │
│     ├─ user-service                     │
│     └─ product-service                  │
└─────────────────────────────────────────┘
```

---

## 🕐 Rotation Schedules

### Automated Schedules (UTC)
- **Production Secrets**: 1st & 15th of month @ 3 AM
- **JWT Tokens**: Every Wednesday @ 2 AM

### Manual Trigger
```bash
# Go to GitHub Actions → Automated Secret Rotation → Run workflow
# Select:
# - Namespace: production / dev
# - Secret Type: all / jwt / database / api-keys
# - Force Rotation: true (ignores recent rotation check)
```

---

## 🔍 Monitoring & Verification

### Check Rotation Status
```bash
# View rotation history
cat secrets/rotation-logs/rotation-history.md

# Check latest commit
git log --grep="rotate secrets" -1

# Verify in Kubernetes
kubectl get sealedsecrets -n production
kubectl get secrets freshbonds-secret -n production -o yaml
```

### Verify External Services
```bash
# MongoDB - Test connection
mongosh "mongodb+srv://admin:NEW_PASSWORD@..."

# PagerDuty - Test integration
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"routing_key":"NEW_KEY","event_action":"trigger",...}'
```

---

## ⚠️ Important Notes

### What Happens During Rotation
1. ✅ **Zero Downtime**: Rolling restart ensures always available
2. ✅ **Automatic Backup**: Old secrets saved to `secrets/backups/`
3. ✅ **Audit Trail**: All rotations logged with timestamp and actor
4. ✅ **Safe Rollback**: Can revert using backed-up secrets if needed

### Failure Scenarios
- **MongoDB API fails**: Pipeline continues with existing URI (no rotation)
- **PagerDuty API fails**: Pipeline continues with existing key (no rotation)
- **Cluster unreachable**: Uses stored public key to create SealedSecret
- **Any step fails**: PagerDuty alert sent (if configured)

### Manual Intervention Required
If automatic rotation fails:
1. Check workflow logs in GitHub Actions
2. Manually rotate the credential on the external service
3. Update the GitHub Secret with new value
4. Re-run the rotation workflow with `force_rotation: true`

---

## 🛡️ Security Best Practices

### API Key Permissions
- **MongoDB Atlas**: Minimum "Organization Project Creator" role
- **PagerDuty**: Read/Write permissions on integrations

### Backup Retention
```bash
# Backups stored for 90 days
# Clean up old backups manually:
find secrets/backups -type d -mtime +90 -exec rm -rf {} \;
```

### Emergency Rollback
```bash
# If rotation breaks something:
BACKUP_DIR=$(ls -t secrets/backups/ | head -1)
cp secrets/backups/$BACKUP_DIR/*.yaml apps/freshbonds/templates/
git add . && git commit -m "Emergency rollback secrets"
git push
```

---

## 📚 References
- [MongoDB Atlas API Docs](https://www.mongodb.com/docs/atlas/api/)
- [PagerDuty API Docs](https://developer.pagerduty.com/api-reference/)
- [SealedSecrets](https://github.com/bitnami-labs/sealed-secrets)
- [GitOps Best Practices](https://opengitops.dev/)
