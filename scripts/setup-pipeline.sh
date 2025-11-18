#!/bin/bash

# Setup CI/CD Pipeline - FreshBonds
# This script sets up all required GitHub secrets and validates the pipeline configuration

set -e

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}╔═══════════════════════════════════════════════════════════╗${COLOR_NC}"
echo -e "${COLOR_BLUE}║     FreshBonds CI/CD Pipeline Setup                       ║${COLOR_NC}"
echo -e "${COLOR_BLUE}╚═══════════════════════════════════════════════════════════╝${COLOR_NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${COLOR_RED}❌ GitHub CLI (gh) is not installed${COLOR_NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo -e "${COLOR_YELLOW}⚠️  Not logged in to GitHub CLI${COLOR_NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${COLOR_GREEN}✅ GitHub CLI is ready${COLOR_NC}"
echo ""

# Function to set GitHub secret
set_secret() {
    local name=$1
    local value=$2
    local description=$3
    
    if [ -z "$value" ]; then
        echo -e "${COLOR_YELLOW}⚠️  Skipping $name (empty value)${COLOR_NC}"
        return
    fi
    
    echo -e "${COLOR_BLUE}Setting secret: $name${COLOR_NC}"
    echo "$value" | gh secret set "$name"
    echo -e "${COLOR_GREEN}✅ $name set${COLOR_NC}"
}

# Collect Docker Hub credentials
echo -e "${COLOR_YELLOW}📦 Docker Hub Credentials${COLOR_NC}"
echo "---------------------------------------------------"
read -p "Docker Hub Username: " DOCKER_USERNAME
read -sp "Docker Hub Password/Token: " DOCKER_PASSWORD
echo ""
echo ""

# Collect MongoDB URI
echo -e "${COLOR_YELLOW}🗄️  MongoDB Configuration${COLOR_NC}"
echo "---------------------------------------------------"
read -p "MongoDB URI (e.g., mongodb+srv://...): " MONGODB_URI
echo ""

# Collect PagerDuty integration key (optional)
echo -e "${COLOR_YELLOW}📟 PagerDuty Integration (Optional)${COLOR_NC}"
echo "---------------------------------------------------"
read -p "PagerDuty Integration Key (press Enter to skip): " PAGERDUTY_KEY
echo ""

# Collect OCI credentials for Terraform (optional)
echo -e "${COLOR_YELLOW}☁️  Oracle Cloud Infrastructure (Optional)${COLOR_NC}"
echo "For Terraform automation"
echo "---------------------------------------------------"
read -p "Setup OCI credentials? (y/n): " setup_oci

if [ "$setup_oci" == "y" ]; then
    read -p "OCI Tenancy OCID: " OCI_TENANCY_OCID
    read -p "OCI User OCID: " OCI_USER_OCID
    read -p "OCI Fingerprint: " OCI_FINGERPRINT
    read -p "OCI Region (e.g., ap-mumbai-1): " OCI_REGION
    
    echo "Provide the path to your OCI private key:"
    read -p "Private key path: " OCI_KEY_PATH
    
    if [ -f "$OCI_KEY_PATH" ]; then
        OCI_PRIVATE_KEY=$(cat "$OCI_KEY_PATH" | base64)
    else
        echo -e "${COLOR_RED}❌ Private key file not found${COLOR_NC}"
        OCI_PRIVATE_KEY=""
    fi
fi
echo ""

# Set GitHub Secrets
echo -e "${COLOR_BLUE}📝 Setting GitHub Secrets...${COLOR_NC}"
echo "---------------------------------------------------"

set_secret "DOCKER_USERNAME" "$DOCKER_USERNAME" "Docker Hub username"
set_secret "DOCKER_PASSWORD" "$DOCKER_PASSWORD" "Docker Hub password/token"
set_secret "MONGODB_URI" "$MONGODB_URI" "MongoDB connection string"

if [ -n "$PAGERDUTY_KEY" ]; then
    set_secret "PAGERDUTY_INTEGRATION_KEY" "$PAGERDUTY_KEY" "PagerDuty integration key"
fi

if [ "$setup_oci" == "y" ]; then
    set_secret "OCI_TENANCY_OCID" "$OCI_TENANCY_OCID" "OCI Tenancy OCID"
    set_secret "OCI_USER_OCID" "$OCI_USER_OCID" "OCI User OCID"
    set_secret "OCI_FINGERPRINT" "$OCI_FINGERPRINT" "OCI API Key Fingerprint"
    set_secret "OCI_REGION" "$OCI_REGION" "OCI Region"
    set_secret "OCI_PRIVATE_KEY" "$OCI_PRIVATE_KEY" "OCI Private Key (base64)"
fi

echo ""
echo -e "${COLOR_GREEN}✅ All secrets configured${COLOR_NC}"
echo ""

# Validate workflows
echo -e "${COLOR_BLUE}🔍 Validating GitHub Actions workflows...${COLOR_NC}"
echo "---------------------------------------------------"

if [ ! -f ".github/workflows/ci-cd.yml" ]; then
    echo -e "${COLOR_RED}❌ Main CI/CD workflow not found${COLOR_NC}"
else
    echo -e "${COLOR_GREEN}✅ CI/CD workflow found${COLOR_NC}"
fi

if [ ! -f ".github/workflows/security-scan.yml" ]; then
    echo -e "${COLOR_RED}❌ Security scan workflow not found${COLOR_NC}"
else
    echo -e "${COLOR_GREEN}✅ Security scan workflow found${COLOR_NC}"
fi

if [ ! -f ".github/workflows/secret-rotation.yml" ]; then
    echo -e "${COLOR_RED}❌ Secret rotation workflow not found${COLOR_NC}"
else
    echo -e "${COLOR_GREEN}✅ Secret rotation workflow found${COLOR_NC}"
fi

echo ""

# Create .gitignore entries
echo -e "${COLOR_BLUE}📝 Updating .gitignore...${COLOR_NC}"
echo "---------------------------------------------------"

cat >> .gitignore << 'EOF'

# Terraform
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.backup
terraform/.terraform.lock.hcl
terraform/terraform.tfvars
terraform/*.plan

# Trivy cache
.trivycache/

# CI/CD artifacts
trivy-results*.json
npm-audit-*.json

# Secrets
secrets/*.key
secrets/*.pem
secrets/sealed-secrets-public-key.crt
!secrets/.gitkeep

# Local environment
.env.local
.env.*.local
EOF

echo -e "${COLOR_GREEN}✅ .gitignore updated${COLOR_NC}"
echo ""

# Test Docker Hub connection
echo -e "${COLOR_BLUE}🐳 Testing Docker Hub connection...${COLOR_NC}"
echo "---------------------------------------------------"

if echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin 2>/dev/null; then
    echo -e "${COLOR_GREEN}✅ Docker Hub authentication successful${COLOR_NC}"
    docker logout
else
    echo -e "${COLOR_YELLOW}⚠️  Could not verify Docker Hub connection${COLOR_NC}"
fi

echo ""

# Summary
echo -e "${COLOR_GREEN}╔═══════════════════════════════════════════════════════════╗${COLOR_NC}"
echo -e "${COLOR_GREEN}║     Setup Complete! 🎉                                    ║${COLOR_NC}"
echo -e "${COLOR_GREEN}╚═══════════════════════════════════════════════════════════╝${COLOR_NC}"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes:"
echo "   git add .github/ policies/ terraform/ scripts/"
echo "   git commit -m 'Add CI/CD pipeline and security policies'"
echo "   git push origin main"
echo ""
echo "2. The pipeline will automatically:"
echo "   - Detect changed services"
echo "   - Run security scans"
echo "   - Build and push Docker images"
echo "   - Update manifest files"
echo "   - Trigger ArgoCD deployment"
echo ""
echo "3. Monitor the pipeline:"
echo "   - GitHub Actions: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
echo "   - ArgoCD: Check your ArgoCD dashboard"
echo ""
echo "4. Configure kubectl access for secret rotation:"
echo "   - Export kubeconfig: kubectl config view --flatten > kubeconfig.yaml"
echo "   - Set secret: cat kubeconfig.yaml | base64 | gh secret set KUBECONFIG"
echo ""
echo -e "${COLOR_BLUE}📚 Documentation:${COLOR_NC}"
echo "   - Pipeline: .github/workflows/README.md"
echo "   - Terraform: terraform/README.md"
echo "   - Policies: policies/README.md"
echo ""
echo -e "${COLOR_GREEN}Happy deploying! 🚀${COLOR_NC}"
