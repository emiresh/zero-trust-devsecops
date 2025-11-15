#!/bin/bash
# Script to securely set up AlertManager Slack webhook
# This ensures the webhook URL is never committed to Git in plain text

set -e

WEBHOOK_URL="https://hooks.slack.com/services/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"
NAMESPACE="monitoring"
SECRET_NAME="alertmanager-slack-webhook"

echo "🔐 Setting up AlertManager Slack webhook securely..."
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Create the namespace if it doesn't exist
echo "📦 Ensuring namespace '$NAMESPACE' exists..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create the secret
echo "🔑 Creating secret '$SECRET_NAME' in namespace '$NAMESPACE'..."
kubectl create secret generic $SECRET_NAME \
  --from-literal=slack-webhook-url="$WEBHOOK_URL" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "✅ Secret created successfully!"
echo ""
echo "📝 Important Security Notes:"
echo "   - The webhook URL is now stored as a Kubernetes Secret"
echo "   - It will NOT be committed to Git (secrets/ folder is in .gitignore)"
echo "   - Only cluster admins with kubectl access can view the secret"
echo ""
echo "🔍 To verify the secret:"
echo "   kubectl get secret $SECRET_NAME -n $NAMESPACE"
echo ""
echo "🔄 To update the webhook URL:"
echo "   kubectl create secret generic $SECRET_NAME \\"
echo "     --from-literal=slack-webhook-url=\"NEW_WEBHOOK_URL\" \\"
echo "     --namespace=$NAMESPACE \\"
echo "     --dry-run=client -o yaml | kubectl apply -f -"
echo ""
echo "🚀 Next steps:"
echo "   1. Commit and push your changes (kube-prometheus-stack.yaml)"
echo "   2. ArgoCD will sync and AlertManager will use the secret"
echo "   3. Delete this setup script if you want: rm scripts/setup-alertmanager-secret.sh"
echo ""
