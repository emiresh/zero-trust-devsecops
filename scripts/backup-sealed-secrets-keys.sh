#!/bin/bash
set -e

echo "🔐 Backing up Sealed Secrets encryption keys..."

# Backup directory
BACKUP_DIR="${HOME}/.kube/sealed-secrets-keys"
mkdir -p "${BACKUP_DIR}"

# Backup with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sealed-secrets-keys-${TIMESTAMP}.yaml"

# Export keys
kubectl get secret -n sealed-secrets \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > "${BACKUP_FILE}"

# Also keep a 'latest' copy
cp "${BACKUP_FILE}" "${BACKUP_DIR}/sealed-secrets-keys-latest.yaml"

echo "✅ Keys backed up to:"
echo "   ${BACKUP_FILE}"
echo "   ${BACKUP_DIR}/sealed-secrets-keys-latest.yaml"
echo ""
echo "⚠️  IMPORTANT: Store this file securely!"
echo "   - DO NOT commit to git"
echo "   - Store in password manager or encrypted storage"
echo "   - Anyone with these keys can decrypt your secrets"
