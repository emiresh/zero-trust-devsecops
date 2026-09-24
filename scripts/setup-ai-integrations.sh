#!/bin/bash
# Quick setup script for AI Security Reports integrations

set -e

echo "🔐 AI Security Reports - Integration Setup"
echo "=========================================="
echo ""

NAMESPACE="ai-security"
SECRET_NAME="ai-collector-integrations"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

echo "This script helps you set up integrations for AI security reports."
echo "You can configure: Slack, PagerDuty, or Custom Webhooks"
echo ""
echo "All integrations are OPTIONAL - you can skip any you don't need."
echo ""

# Prompt for integrations
read -p "Configure Slack integration? (y/n): " SETUP_SLACK
read -p "Configure PagerDuty integration? (y/n): " SETUP_PAGERDUTY
read -p "Configure Custom Webhook? (y/n): " SETUP_WEBHOOK

echo ""

# Collect credentials
SLACK_URL=""
PAGERDUTY_KEY=""
CUSTOM_URL=""

if [[ "$SETUP_SLACK" =~ ^[Yy]$ ]]; then
    echo "📱 Slack Webhook Setup"
    echo "----------------------"
    echo "To get your Slack webhook URL:"
    echo "  1. Go to https://api.slack.com/apps"
    echo "  2. Create New App → From scratch"
    echo "  3. Enable 'Incoming Webhooks'"
    echo "  4. Add New Webhook to Workspace"
    echo "  5. Copy the webhook URL"
    echo ""
    read -p "Enter Slack Webhook URL: " SLACK_URL
    echo ""
fi

if [[ "$SETUP_PAGERDUTY" =~ ^[Yy]$ ]]; then
    echo "📟 PagerDuty Setup"
    echo "------------------"
    echo "To get your PagerDuty routing key:"
    echo "  1. Go to https://[your-account].pagerduty.com"
    echo "  2. Services → New Service (or use existing)"
    echo "  3. Integration: Events API v2"
    echo "  4. Copy the Routing Key"
    echo ""
    read -p "Enter PagerDuty Routing Key: " PAGERDUTY_KEY
    echo ""
fi

if [[ "$SETUP_WEBHOOK" =~ ^[Yy]$ ]]; then
    echo "🔗 Custom Webhook Setup"
    echo "----------------------"
    echo "Enter the URL of your custom webhook endpoint"
    echo "(e.g., for Teams, Discord, or custom SIEM)"
    echo ""
    read -p "Enter Custom Webhook URL: " CUSTOM_URL
    echo ""
fi

# Validate at least one integration
if [[ -z "$SLACK_URL" && -z "$PAGERDUTY_KEY" && -z "$CUSTOM_URL" ]]; then
    echo "⚠️  No integrations configured. Exiting."
    exit 0
fi

# Create namespace if needed
echo "📦 Ensuring namespace '$NAMESPACE' exists..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f - > /dev/null 2>&1

# Build secret creation command
echo "🔑 Creating/updating secret '$SECRET_NAME'..."

SECRET_DATA=""
if [[ -n "$SLACK_URL" ]]; then
    SECRET_DATA="$SECRET_DATA --from-literal=slack-webhook-url=$SLACK_URL"
fi
if [[ -n "$PAGERDUTY_KEY" ]]; then
    SECRET_DATA="$SECRET_DATA --from-literal=pagerduty-routing-key=$PAGERDUTY_KEY"
fi
if [[ -n "$CUSTOM_URL" ]]; then
    SECRET_DATA="$SECRET_DATA --from-literal=custom-webhook-url=$CUSTOM_URL"
fi

# Create the secret
kubectl create secret generic $SECRET_NAME \
  $SECRET_DATA \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo -e "${GREEN}✅ Secret created successfully!${NC}"
echo ""

# Summary
echo "📊 Integration Summary"
echo "======================"
if [[ -n "$SLACK_URL" ]]; then
    echo -e "${GREEN}✓${NC} Slack: Enabled"
fi
if [[ -n "$PAGERDUTY_KEY" ]]; then
    echo -e "${GREEN}✓${NC} PagerDuty: Enabled"
fi
if [[ -n "$CUSTOM_URL" ]]; then
    echo -e "${GREEN}✓${NC} Custom Webhook: Enabled"
fi
echo ""

echo "📝 Next Steps:"
echo "1. Deploy the updated AI collector:"
echo "   git add research/collectors/integrations.py research/collectors/falco_collector.py research/k8s/deployment.yaml"
echo "   git commit -m 'feat: add AI report integrations'"
echo "   git push"
echo ""
echo "2. Wait for deployment (~5 minutes)"
echo "   kubectl get pods -n ai-security -w"
echo ""
echo "3. Test with a security event:"
echo "   kubectl exec -n dev deployment/apigateway -- cat /etc/shadow 2>&1"
echo ""
echo "4. Check your integration:"
if [[ -n "$SLACK_URL" ]]; then
    echo "   - Slack: Check your configured channel"
fi
if [[ -n "$PAGERDUTY_KEY" ]]; then
    echo "   - PagerDuty: Check incidents page"
fi
echo "   - API: kubectl port-forward -n ai-security svc/ai-collector 8000:8000"
echo "          curl http://localhost:8000/reports/latest/text | jq -r '.report'"
echo ""
echo -e "${YELLOW}💡 Tip: See docs/AI-REPORTS-INTEGRATION-GUIDE.md for full setup guide${NC}"
echo ""
echo "🎉 Integration setup complete!"
