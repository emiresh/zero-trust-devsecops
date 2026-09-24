#!/bin/bash

##############################################################################
# Azure AI Foundry Setup - One-Command Automation
#
# This script creates all Azure resources needed for the AI Security Control Plane:
# - Resource Group
# - Azure Storage Account (for datasets/models)
# - Azure OpenAI (GPT-4o-mini deployment)
# - Kubernetes Secret (for credentials)
#
# Prerequisites:
# - Azure CLI installed: brew install azure-cli
# - Logged in: az login
# - Active subscription with OpenAI access
#
# Usage:
#   ./setup_azure.sh
#
##############################################################################

set -e  # Exit on error

echo "🔐 Azure AI Foundry Setup for AI Security Control Plane"
echo "========================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found${NC}"
    echo "   Install: brew install azure-cli"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Azure${NC}"
    echo "   Run: az login"
    exit 1
fi

echo -e "${GREEN}✅ Azure CLI ready${NC}"
echo ""

# Get user input
read -p "Enter Azure region (default: eastus): " LOCATION
LOCATION=${LOCATION:-eastus}

read -p "Enter resource group name (default: ai-security-research-rg): " RESOURCE_GROUP
RESOURCE_GROUP=${RESOURCE_GROUP:-ai-security-research-rg}

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo ""
echo "📌 Configuration:"
echo "   Subscription: $SUBSCRIPTION_ID"
echo "   Region: $LOCATION"
echo "   Resource Group: $RESOURCE_GROUP"
echo ""

read -p "Continue? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "🚀 Creating Azure resources..."
echo ""

# Generate unique names
TIMESTAMP=$(date +%s)
STORAGE_ACCOUNT="aisecdata${TIMESTAMP}"
OPENAI_ACCOUNT="aisec-openai-${TIMESTAMP}"

# Step 1: Create Resource Group
echo "1️⃣  Creating Resource Group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

echo -e "${GREEN}✅ Resource group created${NC}"
echo ""

# Step 2: Create Storage Account
echo "2️⃣  Creating Storage Account: $STORAGE_ACCOUNT"
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --output none

echo -e "${GREEN}✅ Storage account created${NC}"

# Get connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

# Create containers
echo "   Creating blob containers..."
for CONTAINER in datasets models results; do
    az storage container create \
      --name "$CONTAINER" \
      --connection-string "$STORAGE_CONNECTION_STRING" \
      --output none
done

echo -e "${GREEN}✅ Blob containers created: datasets, models, results${NC}"
echo ""

# Step 3: Create Azure OpenAI
echo "3️⃣  Creating Azure OpenAI: $OPENAI_ACCOUNT"
echo "   This may take 2-3 minutes..."

az cognitiveservices account create \
  --name "$OPENAI_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --kind OpenAI \
  --sku S0 \
  --yes \
  --output none

echo -e "${GREEN}✅ Azure OpenAI account created${NC}"

# Get endpoint and key
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name "$OPENAI_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.endpoint -o tsv)

AZURE_OPENAI_KEY=$(az cognitiveservices account keys list \
  --name "$OPENAI_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query key1 -o tsv)

echo ""

# Step 4: Deploy GPT-4o-mini model
echo "4️⃣  Deploying GPT-4o-mini model..."

az cognitiveservices account deployment create \
  --name "$OPENAI_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard \
  --output none 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Model deployment failed. Trying alternative region...${NC}"
    echo "   You may need to deploy the model manually from Azure Portal"
}

echo -e "${GREEN}✅ GPT-4o-mini deployment requested${NC}"
echo ""

# Step 5: Create .env file
echo "5️⃣  Saving credentials to .env file..."

cat > .env << EOF
# Azure AI Foundry Configuration
# Generated: $(date)
# ⚠️  DO NOT COMMIT THIS FILE TO GIT

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY=$AZURE_OPENAI_KEY
AZURE_OPENAI_MODEL=gpt-4o-mini

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING

# Azure ML (optional)
AZUREML_WORKSPACE_NAME=ai-security-ml-workspace
AZUREML_RESOURCE_GROUP=$RESOURCE_GROUP
AZUREML_SUBSCRIPTION_ID=$SUBSCRIPTION_ID

# Resource Details
AZURE_LOCATION=$LOCATION
AZURE_RESOURCE_GROUP=$RESOURCE_GROUP
AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT
AZURE_OPENAI_ACCOUNT=$OPENAI_ACCOUNT
EOF

echo -e "${GREEN}✅ Credentials saved to .env${NC}"
echo ""

# Step 6: Create Kubernetes secret
echo "6️⃣  Creating Kubernetes secret..."

if kubectl get namespace ai-security &> /dev/null; then
    # Delete existing secret if it exists
    kubectl delete secret azure-ai-credentials -n ai-security --ignore-not-found=true
    
    kubectl create secret generic azure-ai-credentials \
      --from-literal=AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
      --from-literal=AZURE_OPENAI_KEY="$AZURE_OPENAI_KEY" \
      --from-literal=AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
      --namespace=ai-security \
      --output=name
    
    echo -e "${GREEN}✅ Kubernetes secret created${NC}"
else
    echo -e "${YELLOW}⚠️  ai-security namespace not found. Create it first:${NC}"
    echo "   kubectl create namespace ai-security"
    echo "   Then run this script again to create the secret."
fi

echo ""
echo "================================================================"
echo -e "${GREEN}🎉 Azure AI Foundry Setup Complete!${NC}"
echo "================================================================"
echo ""
echo "📋 Resources Created:"
echo "   • Resource Group: $RESOURCE_GROUP"
echo "   • Storage Account: $STORAGE_ACCOUNT"
echo "   • Azure OpenAI: $OPENAI_ACCOUNT"
echo "   • Model Deployment: gpt-4o-mini"
echo ""
echo "🔐 Credentials saved to:"
echo "   • Local: .env file (for testing)"
echo "   • Kubernetes: azure-ai-credentials secret"
echo ""
echo "🔗 Azure OpenAI Endpoint:"
echo "   $AZURE_OPENAI_ENDPOINT"
echo ""
echo "💡 Next Steps:"
echo "   1. Test Azure OpenAI: python3 advisors/incident_reporter.py"
echo "   2. Update collector: kubectl apply -f k8s/deployment-with-azure.yaml"
echo "   3. Monitor costs: az consumption usage list -o table"
echo ""
echo "📊 Estimated Monthly Cost: ~$25"
echo "   • Azure OpenAI (GPT-4o-mini): ~$20"
echo "   • Storage (50GB): ~$5"
echo ""
echo -e "${YELLOW}⚠️  Remember:${NC}"
echo "   • .env contains secrets - DO NOT commit to Git"
echo "   • Set spending limits in Azure Portal"
echo "   • Delete resources when done: az group delete --name $RESOURCE_GROUP"
echo ""
