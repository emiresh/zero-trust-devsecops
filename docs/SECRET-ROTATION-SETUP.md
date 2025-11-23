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
# Instead of storing full URI with password, store components separately:
# This allows the workflow to build new URIs with rotated passwords

Name: MONGO_HOST
Value: dev.qzhiudx.mongodb.net

Name: MONGO_DATABASE
Value: freshbonds

Name: MONGO_USERNAME
Value: admin

Name: MONGO_PASSWORD
Value: <current-password>
# ⚠️ You must manually update this after each rotation
```

#### 2. MongoDB Atlas API Key
```bash
# Create API key in MongoDB Atlas:
# 1. Go to https://cloud.mongodb.com
# 2. Organization Settings → Access Manager → API Keys
# 3. Create API Key with "Organization Owner" permissions
# 4. Copy Public Key and Private Key

# Format: GROUP_ID:PUBLIC_KEY:PRIVATE_KEY
# Add to GitHub: Settings → Secrets → Actions → New repository secret
Name: MONGO_API_KEY
Value: 507f1f77bcf86cd799439011:abcd1234:efgh5678wxyz
```

#### 2. MongoDB Atlas API Key
```bash
# Create API key in MongoDB Atlas:
# 1. Go to https://cloud.mongodb.com
# 2. Organization Settings → Access Manager → API Keys
# 3. Create API Key with "Organization Owner" permissions
# 4. Copy Public Key and Private Key

# Format: GROUP_ID:PUBLIC_KEY:PRIVATE_KEY
# Add to GitHub: Settings → Secrets → Actions → New repository secret
Name: MONGO_API_KEY
Value: 507f1f77bcf86cd799439011:abcd1234:efgh5678wxyz
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

#### 4. PagerDuty Service ID
```bash
# Get Service ID:
# 1. Go to your PagerDuty service
# 2. URL will be: https://yourcompany.pagerduty.com/services/PXXXXXX
# 3. Copy the PXXXXXX part

# Add to GitHub
Name: PAGERDUTY_SERVICE_ID
Value: PXXXXXX
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
