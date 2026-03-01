# Terraform Pipeline Guide

## ✅ Current Configuration

Your terraform pipeline has **manual approval gates** configured. Here's the complete flow:

### Push to `main` branch (terraform/** changes)

```
┌─────────────────────────────────────────┐
│ Developer pushes to main                │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ STAGE 1: 🔍 Validate & Format           │
│ - terraform fmt -check                  │
│ - terraform validate                    │
│ Duration: ~1 min                        │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ STAGE 2: 🔐 Security Scan               │
│ - Checkov IaC scanning                  │
│ - Blocks on security failures           │
│ Duration: ~1-2 min                      │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ STAGE 3b: 📋 Plan Production            │
│ - terraform plan                        │
│ - Count: adds/changes/destroys          │
│ - Upload plan artifact                  │
│ - Generate detailed summary             │
│ Duration: ~2-3 min                      │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ ⏸️  MANUAL APPROVAL REQUIRED            │
│                                         │
│ Environment: production                 │
│ Required Reviewers: (you configure)     │
│                                         │
│ Review:                                 │
│ - Plan summary                          │
│ - Resource changes                      │
│ - Potential impact                      │
│                                         │
│ Actions:                                │
│ [ Approve ] or [ Reject ]               │
└──────────────┬──────────────────────────┘
               ▼ (approved)
┌─────────────────────────────────────────┐
│ STAGE 4: 🚀 Apply to OCI                │
│ - Download approved plan                │
│ - terraform apply -auto-approve         │
│ - Show terraform outputs                │
│ - Update deployment summary             │
│ Duration: ~3-5 min                      │
└─────────────────────────────────────────┘
```

## 🔐 Required GitHub Setup

### 1. Configure Production Environment

**Steps:**

1. Go to: `https://github.com/<your-org>/zero-trust-devsecops/settings/environments`

2. Click "**New environment**"

3. Name: `production`

4. Configure:
   - ✅ **Required reviewers**
     - Add: `@your-username` or team members
     - Max: 6 reviewers
   
   - ✅ **Deployment branches** (recommended)
     - Selected branches: `main`
   
   - ⏰ **Wait timer** (optional)
     - Add delay: 0-43200 minutes
   
   - 🔐 **Environment secrets** (optional)
     - Add environment-specific secrets

5. **Save protection rules**

### 2. GitHub Secrets (Already Configured)

Your pipeline uses these secrets:

```yaml
OCI_TENANCY_OCID  → Tenancy OCID
OCI_USER_OCID     → User OCID
OCI_FINGERPRINT   → API key fingerprint
OCI_PRIVATE_KEY   → API private key (PEM format)
OCI_REGION        → OCI region (e.g., us-ashburn-1)
```

## 🎯 Usage Examples

### Example 1: Add New Compute Instance

```bash
# 1. Create branch
git checkout -b infra/add-db-server

# 2. Add resource
cat >> terraform/instances.tf << 'EOF'
resource "oci_core_instance" "db_server" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_id
  display_name        = "database-server"
  shape               = "VM.Standard.E4.Flex"
  
  shape_config {
    memory_in_gbs = 16
    ocpus         = 2
  }
  
  source_details {
    source_id   = var.image_id
    source_type = "image"
  }
}
EOF

# 3. Commit and push
git add terraform/instances.tf
git commit -m "feat: add database server"
git push -u origin infra/add-db-server

# 4. Create PR (optional - to see plan preview)
gh pr create --title "Add database server" --body "Adds dedicated DB server"
# Result: See plan preview in PR comments

# 5. Merge PR
gh pr merge --squash

# 6. Pipeline runs automatically
# - Validate ✅
# - Security Scan ✅
# - Plan Production ✅
# - Waits for approval ⏸️

# 7. Approve deployment
# Go to: Actions → Click run → "Review deployments" → Approve

# 8. Apply runs and creates DB server 🚀
```

### Example 2: Update Security List

```bash
git checkout -b infra/open-postgres-port

# Edit security list
vim terraform/security_list.tf
# Add ingress rule for port 5432

git add terraform/security_list.tf
git commit -m "feat: allow postgres traffic"
git push -u origin infra/open-postgres-port

# Create PR to see plan
gh pr create

# After merge → Approve in GitHub UI
```

## 📊 Plan Summary Example

When you approve, you'll see:

```markdown
## 📋 Terraform Plan (Production)

**Branch:** main
**Commit:** abc123def

### Changes Summary
| Action     | Count |
|------------|-------|
| ➕ Create  | 2     |
| 🔄 Update  | 1     |
| ❌ Destroy | 0     |

<details>
<summary>📄 Full Plan</summary>

Terraform will perform the following actions:

  # oci_core_instance.db_server will be created
  + resource "oci_core_instance" "db_server" {
      + availability_domain = "AD-1"
      + display_name        = "database-server"
      + shape               = "VM.Standard.E4.Flex"
      ...
    }

  # oci_core_security_list.k8s will be updated in-place
  ~ resource "oci_core_security_list" "k8s" {
      + ingress_security_rules {
          + protocol    = "6"
          + source      = "0.0.0.0/0"
          + stateless   = false
          + tcp_options {
              + max = 5432
              + min = 5432
            }
        }
    }

Plan: 2 to add, 1 to change, 0 to destroy.
</details>

---

⚠️ **Manual approval required to apply these changes**
```

## 🔄 Optional: Terraform Cloud Integration

If you want to use **Terraform Cloud** for remote state and collaboration:

### 1. Add Terraform Cloud Token

```bash
# Create token at: https://app.terraform.io/app/settings/tokens

# Add to GitHub Secrets
gh secret set TF_API_TOKEN
# Paste your Terraform Cloud token
```

### 2. Update Pipeline Configuration

In `.github/workflows/terraform.yml`, uncomment these lines:

```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: ${{ env.TF_VERSION }}
    # Uncomment these lines:
    cli_config_credentials_hostname: app.terraform.io
    cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
    terraform_wrapper: true
```

### 3. Configure Terraform Cloud Backend

In `terraform/backend.tf`:

```hcl
terraform {
  cloud {
    organization = "your-org-name"
    
    workspaces {
      name = "oci-k8s-production"
    }
  }
  
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}
```

### 4. Benefits of Terraform Cloud

| Feature | Benefit |
|---------|---------|
| **Remote State** | Shared, encrypted state storage |
| **State Locking** | Prevents concurrent modifications |
| **Version History** | Track all state changes |
| **Cost Estimation** | Preview infrastructure costs |
| **Policy as Code** | Sentinel policies (paid) |
| **VCS Integration** | Direct GitHub integration |
| **Team Collaboration** | Multi-user workflows |

## 🛡️ Security Best Practices

### 1. Review Every Plan

**Before approving, verify:**
- ✅ Expected resources only
- ✅ No unexpected destroys
- ✅ Security group changes reviewed
- ✅ Cost impact acceptable
- ✅ Proper resource naming

### 2. Use Branch Protection

```yaml
# .github/branch-protection.yml
main:
  required_pull_request_reviews:
    required_approving_review_count: 1
  required_status_checks:
    strict: true
    contexts:
      - validate
      - security-scan
```

### 3. Limit Approvers

**Only senior engineers should approve infrastructure changes:**
- DevOps team leads
- Platform engineers
- Security team members

### 4. Emergency Procedures

**If you need to bypass approval (EMERGENCY ONLY):**

```bash
# 1. Temporarily remove environment protection
# Settings → Environments → production → Delete protection rules

# 2. Apply will run automatically on next push

# 3. RESTORE protection rules immediately after
```

## 📈 Monitoring & Audit

### View Pipeline History

```bash
# List recent runs
gh run list --workflow=terraform.yml

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id> --name terraform-plan
```

### Approval Audit Trail

All approvals are logged:
- Who approved
- When approved
- Approval comment
- Plan that was approved

View in: `Actions → Workflow Run → Deployments`

## 🔍 Troubleshooting

### Issue: "Waiting for approval" but no button

**Solution:** Configure production environment in Settings → Environments

### Issue: "Plan artifact not found"

**Solution:** Plan job must complete successfully before approval

### Issue: "Apply failed: plan file expired"

**Solution:** Plan artifacts expire after 5 days. Re-run pipeline.

### Issue: "OCI authentication failed"

**Solution:** Verify secrets are set correctly:
```bash
gh secret list
```

## 📚 Additional Resources

- [Terraform Pipeline Architecture](./PIPELINE-ARCHITECTURE.md)
- [GitHub Environments Docs](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [OCI Provider Docs](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Checkov Rules](https://www.checkov.io/5.Policy%20Index/terraform.html)

---

**Questions?** Contact the DevOps team or create an issue.
