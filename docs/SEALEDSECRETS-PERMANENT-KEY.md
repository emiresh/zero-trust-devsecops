# SealedSecrets Permanent Key Setup

## 🎯 Philosophy: One Key Forever

You have **ONE permanent SealedSecrets private key** stored in GitHub Secrets (`SEALED_SECRETS_PRIVATE_KEY`). This key:
- ✅ **Never changes** (unless you intentionally rotate it)
- ✅ **Automatically restores** on cluster restart
- ✅ **Works forever** with all your existing SealedSecrets
- ✅ **No manual intervention** required

---

## 🔐 The Master Key

### Location
- **GitHub Secret**: `SEALED_SECRETS_PRIVATE_KEY` ← **THIS IS YOUR MASTER KEY**
- **Value**: Base64-encoded Kubernetes Secret containing `tls.crt` and `tls.key`

### What It Contains
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sealed-secrets-key2pffg
  namespace: sealed-secrets
  labels:
    sealedsecrets.bitnami.com/sealed-secrets-key: active
type: kubernetes.io/tls
data:
  tls.crt: [base64 encoded public certificate]
  tls.key: [base64 encoded private key]
```

---

## ⚙️ How It Works

### Automatic Key Management

```
┌─────────────────────────────────────────┐
│  Cluster Starts/Restarts                │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Workflow: Ensure SealedSecrets Keys    │
│  (.github/workflows/backup-sealed-      │
│   secrets.yml)                          │
└───────────────┬─────────────────────────┘
                │
                ▼
        ┌───────┴───────┐
        │ Keys in       │
        │ cluster?      │
        └───┬───────┬───┘
            │       │
         NO │       │ YES
            │       │
            ▼       ▼
    ┌───────────┐ ┌────────────────┐
    │ Restore   │ │ Do nothing     │
    │ from      │ │ Keys already   │
    │ GitHub    │ │ correct        │
    │ Secret    │ └────────────────┘
    └─────┬─────┘
          │
          ▼
    ┌───────────────────────┐
    │ Apply to cluster:     │
    │ kubectl apply -f keys │
    └─────┬─────────────────┘
          │
          ▼
    ┌────────────────────────┐
    │ Restart controller     │
    │ All SealedSecrets      │
    │ automatically decrypt  │
    └────────────────────────┘
```

---

## 📋 One-Time Setup (Already Done!)

### Step 1: Copy Key to GitHub Secret ✅

You already have the base64 value in `sealed-secrets-keys-backup.b64`:

```bash
# The content is:
YXBpVmVyc2lvbjogdjEKaXRlbXM6Ci0gYXBpVmVyc2lvbjogdjEKICBkYXRh...
```

**Add to GitHub:**
1. Go to: https://github.com/emiresh/zero-trust-devsecops/settings/secrets/actions
2. Click "New repository secret"
3. Name: `SEALED_SECRETS_PRIVATE_KEY`
4. Value: [paste entire content from `sealed-secrets-keys-backup.b64`]
5. Click "Add secret"

**DO THIS ONCE. NEVER CHANGE IT.**

---

## 🚀 Usage

### Creating New SealedSecrets

Always use the **public key** from the repository:

```bash
# The public key is in: sealed-secrets-public-key.crt

# Example: Seal a secret
kubectl create secret generic my-app-secret \
  --from-literal=DATABASE_URL='postgres://...' \
  --from-literal=API_KEY='abc123' \
  --dry-run=client -o yaml | \
  kubeseal --cert=sealed-secrets-public-key.crt -o yaml > my-sealed-secret.yaml

# Commit to git
git add my-sealed-secret.yaml
git commit -m "Add sealed secret for my-app"
git push
```

### Cluster Restart Scenario

**What happens:**
1. Cluster restarts
2. SealedSecrets controller starts with NEW keys (wrong!)
3. Existing SealedSecrets can't be decrypted ❌

**Automatic fix:**
1. Run workflow: `Ensure SealedSecrets Keys`
2. Detects missing/wrong keys
3. Restores from `SEALED_SECRETS_PRIVATE_KEY`
4. Restarts controller
5. All SealedSecrets decrypt ✅

**Manual trigger:**
```bash
# Go to: GitHub Actions → Ensure SealedSecrets Keys → Run workflow
```

### New Cluster Setup

```bash
# 1. Install SealedSecrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# 2. Run workflow to install permanent keys
# GitHub Actions → Ensure SealedSecrets Keys → Run workflow

# 3. Deploy your SealedSecrets
kubectl apply -f apps/freshbonds/templates/sealed-secret.yaml

# 4. Verify decryption
kubectl get secrets -n production freshbonds-secret
```

---

## 🛡️ Security & Best Practices

### DO ✅
- ✅ Keep `SEALED_SECRETS_PRIVATE_KEY` in GitHub Secrets
- ✅ Keep this repository PRIVATE
- ✅ Use the same key forever (consistency)
- ✅ Run `Ensure SealedSecrets Keys` workflow after cluster restart
- ✅ Use `sealed-secrets-public-key.crt` to create new SealedSecrets

### DON'T ❌
- ❌ Never change `SEALED_SECRETS_PRIVATE_KEY` (breaks all existing SealedSecrets)
- ❌ Never commit `sealed-secrets-keys-backup.yaml` to public repo
- ❌ Never delete `SEALED_SECRETS_PRIVATE_KEY` from GitHub Secrets
- ❌ Never manually create new keys in cluster

---

## 🔄 Key Rotation (Advanced - Rare)

**Only rotate if:**
- Key is compromised
- Compliance requirement (every 90 days, etc.)
- Migrating to new encryption algorithm

**Process:**
1. Generate new keys in cluster
2. Re-seal ALL SealedSecrets with new public key
3. Update `SEALED_SECRETS_PRIVATE_KEY` in GitHub Secrets
4. Deploy all re-sealed SealedSecrets
5. Remove old keys

**This is a BREAKING CHANGE and requires re-sealing everything!**

---

## 📊 Verification

### Check Keys in Cluster
```bash
# Should show your permanent key
kubectl get secrets -n sealed-secrets \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active

# Expected output:
# NAME                        TYPE                DATA   AGE
# sealed-secrets-key2pffg     kubernetes.io/tls   2      5m
```

### Check SealedSecrets Are Decrypting
```bash
# List all SealedSecrets
kubectl get sealedsecrets -A

# List decrypted regular Secrets
kubectl get secrets -A | grep freshbonds

# Both should exist for each SealedSecret
```

### Check Controller Logs
```bash
kubectl logs -n sealed-secrets -l name=sealed-secrets-controller --tail=50

# Should NOT see errors like:
# - "cannot decrypt"
# - "no private key available"
```

---

## 🆘 Troubleshooting

### Problem: SealedSecrets Not Decrypting After Cluster Restart

**Cause:** Cluster generated new keys instead of using permanent key

**Solution:**
```bash
# 1. Run workflow
# GitHub Actions → Ensure SealedSecrets Keys → Run workflow

# OR manual restore:
echo "$SEALED_SECRETS_PRIVATE_KEY_VALUE" | base64 -d | kubectl apply -f -
kubectl rollout restart deployment/sealed-secrets-controller -n sealed-secrets
```

### Problem: Lost SEALED_SECRETS_PRIVATE_KEY

**Cause:** GitHub Secret was deleted

**Solution:**
```bash
# If you still have the cluster with working keys:
kubectl get secrets -n sealed-secrets \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active \
  -o yaml | base64 > new-backup.b64

# Re-add to GitHub Secrets with this value
```

**Prevention:** Keep offline backup in password manager (1Password, Bitwarden, etc.)

### Problem: Want to Verify GitHub Secret is Correct

```bash
# 1. Decode GitHub Secret value
echo "$SEALED_SECRETS_PRIVATE_KEY_VALUE" | base64 -d > test-restore.yaml

# 2. Check it's valid
grep "kind: Secret" test-restore.yaml
grep "tls.key" test-restore.yaml
grep "tls.crt" test-restore.yaml

# All three should return results
```

---

## 📚 Files in Repository

| File | Purpose | Commit to Git? |
|------|---------|---------------|
| `sealed-secrets-keys-backup.yaml` | Reference copy of keys | ✅ Yes (repo is private) |
| `sealed-secrets-public-key.crt` | Public cert for sealing | ✅ Yes (safe to share) |
| `sealed-secrets-keys-backup.b64` | Base64 for GitHub Secret | ✅ Yes (reference) |
| `backups/sealed-secrets/*.yaml` | Timestamped backups | ✅ Yes (history) |

---

## ✅ Summary

1. **One permanent key** in `SEALED_SECRETS_PRIVATE_KEY` GitHub Secret
2. **Auto-restores** on cluster restart via workflow
3. **Use forever** - no rotation needed unless required
4. **Public key** in repo for creating new SealedSecrets
5. **Zero manual work** - fully automated

**Your SealedSecrets are now bulletproof!** 🎉
