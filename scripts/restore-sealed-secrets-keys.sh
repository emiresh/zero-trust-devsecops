#!/bin/bash
set -e

echo "🔄 Restoring Sealed Secrets encryption keys..."

# Default backup location
BACKUP_DIR="${HOME}/.kube/sealed-secrets-keys"
BACKUP_FILE="${BACKUP_DIR}/sealed-secrets-keys-latest.yaml"

# Allow custom backup file as argument
if [ -n "$1" ]; then
  BACKUP_FILE="$1"
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Backup file not found: ${BACKUP_FILE}"
  echo ""
  echo "Usage: $0 [backup-file]"
  echo "Example: $0 ${BACKUP_DIR}/sealed-secrets-keys-20231122.yaml"
  exit 1
fi

echo "📂 Using backup file: ${BACKUP_FILE}"

# Check if sealed-secrets namespace exists
if ! kubectl get namespace sealed-secrets &>/dev/null; then
  echo "⚠️  sealed-secrets namespace doesn't exist. Creating it..."
  kubectl create namespace sealed-secrets
fi

# Delete existing keys (if any)
echo "🗑️  Removing existing keys..."
kubectl delete secret -n sealed-secrets \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  --ignore-not-found=true

# Restore keys
echo "📥 Restoring keys..."
kubectl apply -f "${BACKUP_FILE}"

# Restart sealed-secrets controller to pick up the keys
echo "🔄 Restarting sealed-secrets controller..."
kubectl rollout restart deployment -n sealed-secrets sealed-secrets-controller 2>/dev/null || \
kubectl rollout restart deployment -n sealed-secrets -l app.kubernetes.io/name=sealed-secrets 2>/dev/null || \
kubectl delete pod -n sealed-secrets -l app.kubernetes.io/name=sealed-secrets

echo ""
echo "✅ Keys restored successfully!"
echo "⏳ Waiting for controller to restart..."
kubectl wait --for=condition=ready pod -n sealed-secrets -l app.kubernetes.io/name=sealed-secrets --timeout=60s

echo ""
echo "🎉 Done! Your SealedSecrets should now decrypt successfully."
echo "   Check with: kubectl get sealedsecret -A"
