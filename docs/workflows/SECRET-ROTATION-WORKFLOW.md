# Secret Rotation Workflow

> **File**: `.github/workflows/secret-rotation.yml`  
> **Purpose**: Automated rotation of application secrets and database credentials  
> **Trigger**: Monthly schedule (1st of month at 3 AM UTC) or manual dispatch

---

## Overview

Automates secret rotation for enhanced security, including:
- MongoDB database passwords via Atlas API
- JWT secrets
- API keys
- TLS certificates

All secrets are encrypted with SealedSecrets and committed to Git safely.

---

## Triggers

### Scheduled
```yaml
schedule:
  - cron: '0 3 1 * *'  # Monthly on 1st at 3 AM UTC
```

### Manual Dispatch
```bash
Actions → Automated Secret Rotation → Run workflow

Options:
  - secret_type: [all|jwt|database|api-keys|tls-certs]
  - force_rotation: false
  - notification: true
```

---

## Process Flow

```
1. Setup
   ├─ Install kubeseal & kubectl
   ├─ Configure cluster access
   └─ Fetch SealedSecrets public key

2. Rotate Secrets
   ├─ Generate new passwords (32 chars)
   ├─ Update MongoDB Atlas via API
   └─ Generate new JWT secrets

3. Seal Secrets
   ├─ Create Kubernetes Secret (plaintext)
   ├─ Encrypt with kubeseal
   └─ Generate SealedSecret YAML

4. Commit & Deploy
   ├─ Update apps/freshbonds/templates/sealed-secret.yaml
   ├─ Git commit + push
   └─ ArgoCD auto-syncs to cluster
```

---

## MongoDB Rotation

### Required GitHub Secrets
```bash
MONGO_HOST=dev.qzhiudx.mongodb.net
MONGO_DATABASE=freshbonds
MONGO_USERNAME=admin
MONGO_API_KEY=PUBLIC_KEY:PRIVATE_KEY  # MongoDB Atlas API credentials
MONGO_PROJECT_ID=<atlas-project-id>
```

### API Call
```bash
# Update user password
curl -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/${PROJECT_ID}/databaseUsers/admin/${USER}" \
  -u "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  --digest \
  -d '{"password": "${NEW_PASSWORD}"}'
```

### New MongoDB URI
```bash
mongodb+srv://admin:${NEW_PASSWORD}@dev.qzhiudx.mongodb.net/freshbonds?appName=Dev
```

---

## Sealed Secrets Encryption

### Public Key Sources (Priority Order)

1. **From Cluster** (preferred)
```bash
kubectl get secret -n sealed-secrets \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active \
  -o jsonpath='{.items[0].data.tls\.crt}' | base64 -d
```

2. **From GitHub Secret**
```bash
SEALED_SECRETS_PRIVATE_KEY  # Backup key stored in GitHub
```

3. **From Repository**
```bash
sealed-secrets-public-key.crt  # Committed public key file
```

### Sealing Process
```bash
# Create plaintext secret
cat > /tmp/secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: freshbonds-secret
  namespace: dev
stringData:
  MONGODB_URI: "${NEW_MONGODB_URI}"
  JWT_SECRET: "${NEW_JWT_SECRET}"
  NODE_ENV: "production"
EOF

# Encrypt with kubeseal
kubeseal --format=yaml \
  --cert=sealed-secrets-public-key.crt \
  < /tmp/secret.yaml \
  > apps/freshbonds/templates/sealed-secret.yaml
```

---

## Generated Secrets

| Secret | Type | Rotation | Format |
|--------|------|----------|--------|
| `MONGODB_URI` | Connection String | Monthly | `mongodb+srv://` |
| `JWT_SECRET` | Random | Monthly | Base64, 64 chars |
| `IPG_*` | Payment Gateway | Manual | As configured |
| `NODE_ENV` | Static | Never | `production` |

---

## Security Features

### 1. Secure Generation
```bash
# 32-character random alphanumeric
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

### 2. Zero Exposure
- Secrets never logged
- Encrypted before Git commit
- Only unsealed by cluster controller

### 3. Audit Trail
- Git commits show rotation timestamp
- Rotation logs in `docs/rotation-logs/rotation-history.md`
- GitHub Issues created for audit

---

## Commit Format

```bash
chore: Rotate secrets - database password updated [skip ci]

Rotation Details:
- Type: database
- Timestamp: 2026-03-01T03:00:00Z
- MongoDB: ✅ Password rotated
- SealedSecret: ✅ Updated and committed
```

---

## Troubleshooting

### Issue: MongoDB API fails

**Error**:
```
❌ MongoDB API call failed (HTTP 401)
```

**Solution**:
1. Verify `MONGO_API_KEY` format: `PUBLIC:PRIVATE`
2. Check API key permissions in MongoDB Atlas
3. Ensure project ID is correct

### Issue: Kubeseal encryption fails

**Error**:
```
error: cannot get sealed secret service: not found
```

**Solution**:
1. Verify `SEALED_SECRETS_PRIVATE_KEY` is set in GitHub Secrets
2. Check public key validity:
```bash
openssl x509 -in sealed-secrets-public-key.crt -noout -text
```

### Issue: ArgoCD not sync secret

**Solution**:
1. Delete and recreate secret in cluster:
```bash
kubectl delete secret freshbonds-secret -n dev
# Controller will recreate from SealedSecret
```

2. Force ArgoCD sync:
```bash
kubectl patch application freshbonds-dev -n argocd --type merge -p '{}'
```

---

## Related Documentation

- [SealedSecrets Setup](../security/SEALEDSECRETS-SETUP.md)
- [Secret Management](../security/SECRET-MANAGEMENT.md)
- [Architecture](../architecture/SYSTEM-ARCHITECTURE.md)

---

**Last Updated**: March 2026
