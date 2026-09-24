#!/bin/bash
# Script to securely set up AlertManager PagerDuty integration

set -e

NAMESPACE="monitoring"
SECRET_NAME="alertmanager-pagerduty-key"

echo "🔐 Setting up AlertManager PagerDuty integration..."
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Prompt for PagerDuty Integration Key
echo "📝 Please provide your PagerDuty Integration Key"
echo ""
echo "To get your integration key:"
echo "  1. Go to https://[your-account].pagerduty.com/"
echo "  2. Navigate to Services → Select your service → Integrations"
echo "  3. Add integration → 'Events API v2'"
echo "  4. Copy the Integration Key"
echo ""
read -p "Enter PagerDuty Integration Key: " INTEGRATION_KEY

if [ -z "$INTEGRATION_KEY" ]; then
    echo "❌ Integration key cannot be empty!"
    exit 1
fi

# Create the namespace if it doesn't exist
echo ""
echo "📦 Ensuring namespace '$NAMESPACE' exists..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create the secret
echo "🔑 Creating secret '$SECRET_NAME' in namespace '$NAMESPACE'..."
kubectl create secret generic $SECRET_NAME \
  --from-literal=integration-key="$INTEGRATION_KEY" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "✅ Secret created successfully!"
echo ""
echo "📝 Important Security Notes:"
echo "   - The integration key is now stored as a Kubernetes Secret"
echo "   - It will NOT be committed to Git (secrets/ folder is in .gitignore)"
echo "   - Only cluster admins with kubectl access can view the secret"
echo ""
echo "🔍 To verify the secret:"
echo "   kubectl get secret $SECRET_NAME -n $NAMESPACE"
echo ""
echo "🔄 To update the integration key:"
echo "   kubectl create secret generic $SECRET_NAME \\"
echo "     --from-literal=integration-key=\"NEW_KEY\" \\"
echo "     --namespace=$NAMESPACE \\"
echo "     --dry-run=client -o yaml | kubectl apply -f -"
echo ""
echo "🚀 Next steps:"
echo "   1. Test the integration by triggering a test alert"
echo "   2. Commit and push your kube-prometheus-stack.yaml changes"
echo "   3. ArgoCD will sync and AlertManager will use PagerDuty"
echo ""
echo "🧪 To test the integration:"
echo "   kubectl run test-shell --image=ubuntu -n dev -- sleep 3600"
echo "   kubectl exec -it test-shell -n dev -- /bin/bash"
echo "   (This should trigger a Falco alert → AlertManager → PagerDuty)"
echo ""
