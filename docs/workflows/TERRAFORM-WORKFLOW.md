# Terraform Infrastructure Workflow

**File**: `.github/workflows/terraform.yml`

Automated Infrastructure as Code (IaC) pipeline for deploying and managing OCI cloud resources with security-first validation.

---

## 📋 Overview

This workflow manages the complete lifecycle of Terraform infrastructure on Oracle Cloud Infrastructure (OCI):

- **Left-Shift Security**: Validates and scans IaC before deployment
- **State Management**: Uses OCI Object Storage backend with locking
- **Security Gates**: Blocks deployment if critical IaC vulnerabilities detected
- **Zero-Trust**: Secrets never stored in workflow, only in environment

**Duration**: ~15 minutes (full plan + apply)  
**Concurrency**: Queued (prevents state lock conflicts)

---

## 🎯 Triggers

### Automatic Triggers

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform.yml'
  
  pull_request:
    branches: [main, develop]
    paths:
      - 'terraform/**'
```

**Behavior**:
- **PR**: Runs `terraform plan` only (preview changes)
- **Push to main**: Runs `plan` + waits for approval + `apply`
- **Push to develop**: Runs `plan` only (test environment)

### Manual Trigger

```bash
# Via GitHub Actions UI
Actions → Terraform Security & Deployment → Run workflow
```

**No manual inputs** - workflow automatically determines action based on branch.

---

## 🔄 Workflow Stages

### Stage 1: Validate & Format

**Purpose**: Catch syntax errors and formatting issues before security scan

```bash
terraform fmt -check -recursive  # Formatting validation
terraform init -backend=false    # Syntax check (no remote state)
terraform validate               # Configuration validation
```

**Success Criteria**:
- ✅ All `.tf` files properly formatted
- ✅ No syntax errors
- ✅ All required variables defined
- ✅ Valid provider configuration

**On Failure**:
- Comments on PR with formatting instructions
- Blocks workflow progression

---

### Stage 2: Security Scan (Left-Shift)

**Tool**: Checkov (IaC security scanner)

**Scans For**:
```yaml
Security Checks:
  - CKV_OCI_5: Legacy IMDS endpoints disabled
  - CKV_OCI_19: SSH restricted to specific IPs
  - CKV_OCI_20: Overly permissive security rules
  - CKV_OCI_17: Stateless rules vs stateful
  - CKV_OCI_21: Encryption at rest
  - 800+ additional OCI security checks
```

**Checkov Configuration** (`.checkov.yaml`):
```yaml
framework:
  - terraform
soft-fail: false  # BLOCK on failures (critical)
download-external-modules: true
```

**Severity Handling**:
- 🔴 **CRITICAL/HIGH**: Blocks deployment
- 🟡 **MEDIUM**: Warns but allows
- ⚪ **LOW**: Info only

**Allowed Skips**:
```hcl
# In Terraform files - with justification
#checkov:skip=CKV_OCI_19:SSH access from internet required for control plane
```

**Outputs**:
- `checkov-results.sarif` → GitHub Security tab
- PR comment with scan summary
- Failed checks with remediation guidance

---

### Stage 3: Terraform Plan

**Purpose**: Preview infrastructure changes before applying

```bash
terraform init     # Initialize with OCI backend
terraform plan \
  -out=tfplan \
  -var-file=terraform.tfvars \
  -lock=true
terraform show -json tfplan > plan.json
```

**OCI Backend Configuration**:
```hcl
backend "s3" {
  bucket   = "terraform-state-bucket"
  key      = "zero-trust-devsecops/terraform.tfstate"
  region   = "us-ashburn-1"
  endpoint = "https://namespace.compat.objectstorage.us-ashburn-1.oraclecloud.com"
  
  skip_credentials_validation = true
  skip_region_validation      = true
  skip_metadata_api_check     = true
  use_path_style              = true
}
```

**State Locking**:
- Uses DynamoDB-compatible locking (OCI NoSQL)
- Prevents concurrent modifications
- Automatically released on success/failure

**Plan Analysis**:
```bash
# Resources to add/change/destroy
to_add=$(jq '.resource_changes | map(select(.change.actions == ["create"])) | length' plan.json)
to_change=$(jq '.resource_changes | map(select(.change.actions == ["update"])) | length' plan.json)
to_destroy=$(jq '.resource_changes | map(select(.change.actions == ["delete"])) | length' plan.json)

# Destructive changes require manual approval
if to_destroy > 0; then
  echo "⚠️ DESTRUCTIVE: $to_destroy resources will be destroyed"
  # Tag for approval
fi
```

**PR Comment Example**:
```
📊 Terraform Plan Summary

Resources:
  + 3 to add
  ~ 1 to change
  - 0 to destroy

Changes:
  + oci_core_instance.worker-3
  + oci_core_security_list.k8s_ports
  ~ oci_core_instance.worker-1 (metadata)

💡 View full plan in workflow logs
```

---

### Stage 4: Terraform Apply

**Trigger**: 
- Manual approval required (via deployment environment)
- Only runs on `push` to `main` branch
- Skipped for PRs and develop branch

**Process**:
```bash
# 1. Wait for approval
environment: production  # Requires reviewer approval in GitHub

# 2. Re-init (ensure latest state)
terraform init -reconfigure

# 3. Apply saved plan
terraform apply -auto-approve tfplan

# 4. Capture outputs
terraform output -json > outputs.json
```

**Approval Requirements**:
- 1 reviewer with write access
- Manual approval button in GitHub Actions
- Can be skipped for emergency via workflow_dispatch

**On Success**:
- Infrastructure deployed
- Outputs saved as artifact
- State locked and released

**On Failure**:
- State may be partially applied
- Manual intervention required
- State lock automatically released

---

## 🔐 Required Secrets

Stored in GitHub Secrets (Settings → Secrets and variables → Actions):

| Secret | Purpose | Example |
|--------|---------|---------|
| `OCI_TENANCY_OCID` | OCI tenancy identifier | `ocid1.tenancy.oc1..aaa...` |
| `OCI_USER_OCID` | OCI user for API calls | `ocid1.user.oc1..aaa...` |
| `OCI_FINGERPRINT` | API key fingerprint | `12:34:56:78:90:ab:cd:ef` |
| `OCI_REGION` | OCI region | `us-ashburn-1` |
| `OCI_PRIVATE_KEY` | API private key (PEM) | `-----BEGIN RSA PRIVATE KEY-----...` |

**Setup Instructions**:
```bash
# Generate OCI API key
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem

# Get fingerprint
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c

# Upload public key to OCI Console
OCI Console → User Settings → API Keys → Add API Key

# Copy private key to GitHub Secret
cat ~/.oci/oci_api_key.pem  # Add to OCI_PRIVATE_KEY secret
```

---

## 📊 Resources Managed

### Current Infrastructure

**Compute Instances** (3):
- `freshbonds-control-plane-1` (Kubernetes master)
- `freshbonds-worker-1` (Worker node)
- `freshbonds-worker-2` (Worker node)

**Networking**:
- VCN: `10.0.0.0/16`
- Public Subnet: `10.0.0.0/24` (control plane)
- Private Subnet: `10.0.1.0/24` (workers)
- Internet Gateway
- NAT Gateway
- Route Tables (public/private)

**Security**:
- Security Lists (ingress/egress rules)
- Network Security Groups
- Instance Metadata settings

**Storage**:
- Boot volumes (50 GB each)
- Block volumes (persistent storage)

### Terraform Modules

```
terraform/
├── provider.tf          # OCI provider config
├── backend.tf           # Remote state config
├── variables.tf         # Input variables
├── terraform.tfvars     # Variable values (gitignored)
├── instances.tf         # Compute instances
├── vcn.tf               # Virtual Cloud Network
├── subnet.tf            # Public/private subnets
├── security_list.tf     # Firewall rules
├── route_tables.tf      # Routing config
├── gateway.tf           # Internet/NAT gateways
├── lb.tf                # Load balancers
├── data.tf              # Data sources
└── outputs.tf           # Output values
```

---

## 🛡️ Security Features

### 1. **Credential Protection**
```yaml
# Secrets never exposed in logs
env:
  TF_VAR_private_key: ${{ secrets.OCI_PRIVATE_KEY }}

# terraform_wrapper: false  (prevents accidental logging)
```

### 2. **State Encryption**
- State stored in OCI Object Storage with encryption at rest
- State locking prevents concurrent modifications
- No sensitive values in state file (use Sealed Secrets)

### 3. **Plan Verification**
- Manual approval required before apply
- Destructive changes highlighted
- No auto-apply on PRs

### 4. **Audit Trail**
- All Terraform runs logged to GitHub Actions
- State history preserved in OCI Object Storage
- Git commits track IaC changes

---

## 🚨 Troubleshooting

### Plan/Apply Fails with "State Locked"

**Cause**: Previous run crashed without releasing lock

**Solution**:
```bash
# Via GitHub Actions
terraform force-unlock <LOCK_ID>

# Or via OCI Console
# Navigate to Object Storage → terraform-state-bucket → .terraform.lock.info
# Delete lock file
```

---

### Checkov Blocks Deployment

**Symptoms**:
```
Check: CKV_OCI_20: "OCI security list allows all traffic"
FAILED for resource: oci_core_security_list.main
```

**Options**:
1. **Fix the issue** (preferred):
   ```hcl
   # Change from 0.0.0.0/0 to specific CIDR
   source = "203.0.113.0/24"
   ```

2. **Skip with justification**:
   ```hcl
   #checkov:skip=CKV_OCI_20:Proxy requires all traffic access
   resource "oci_core_security_list" "main" {
     ...
   }
   ```

---

### OCI API Authentication Fails

**Symptoms**:
```
Error: Service error:NotAuthenticated. The required information to complete authentication was not provided
```

**Check**:
1. Secrets are correctly set in GitHub
2. OCI API key is uploaded to OCI Console
3. Fingerprint matches uploaded key
4. User has required permissions (manage compute, network)

**Verify**:
```bash
# Test OCI CLI with same credentials
oci iam user get --user-id $OCI_USER_OCID
```

---

### Resources Not Destroyed

**Symptoms**:
```
terraform destroy
Error: Resource has dependent objects
```

**Cause**: Resources have dependencies (e.g., instances attached to subnets)

**Solution**:
```bash
# 1. Identify dependencies
terraform state list

# 2. Remove dependent resources first
terraform destroy -target=oci_core_instance.worker-1

# 3. Then destroy parent resources
terraform destroy -target=oci_core_subnet.private
```

**Order**:
1. Compute instances
2. Block volumes
3. Subnets
4. Route tables
5. Gateways
6. VCN

---

### Plan Shows Unexpected Changes

**Symptoms**: Resources recreated on every run

**Common Causes**:
1. **Drift**: Manual changes in OCI Console
2. **Provider version change**: Update may change defaults
3. **State file mismatch**: Using wrong backend

**Investigation**:
```bash
# Check for drift
terraform plan -detailed-exitcode

# Refresh state from actual infrastructure
terraform refresh

# Compare state vs config
terraform show
```

---

## 📁 Artifacts

Available after each workflow run:

| Artifact | Contents | Retention |
|----------|----------|-----------|
| `terraform-plan` | Plan output (JSON + text) | 90 days |
| `checkov-results` | IaC security scan results | 90 days |
| `terraform-outputs` | Deployed resource outputs | 90 days |

**Download**:
```
Actions → Workflow run → Artifacts section
```

---

## 📚 Related Documentation

- [OCI Provider Docs](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Terraform Backend Migration](../docs/TERRAFORM-BACKEND-MIGRATION.md)
- [Security Tools Guide](../security/SECURITY-TOOLS.md)
- [Infrastructure Architecture](../architecture/SYSTEM-ARCHITECTURE.md)

---

## 🔧 Manual Operations

### Running Terraform Locally

```bash
cd terraform

# Set OCI credentials
export TF_VAR_tenancy_ocid="ocid1.tenancy..."
export TF_VAR_user_ocid="ocid1.user..."
export TF_VAR_fingerprint="12:34:..."
export TF_VAR_region="us-ashburn-1"

# Initialize
terraform init

# Plan
terraform plan -var-file=terraform.tfvars

# Apply (with approval)
terraform apply -var-file=terraform.tfvars
```

---

### Emergency Destroy

**⚠️ CAUTION**: This destroys ALL infrastructure

```bash
# Backup state first
terraform state pull > backup-$(date +%Y%m%d).tfstate

# Destroy everything
terraform destroy -auto-approve

# Verify destruction
terraform show
```

---

**Last Updated**: March 2026  
**Workflow Version**: v1.14.0
