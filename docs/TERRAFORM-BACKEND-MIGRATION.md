# 🆙 Terraform 1.14+ OCI Backend Migration Guide

## ✅ What Was Upgraded

### 1. Terraform Version
- **Before:** `1.5.0`
- **After:** `1.14.0` ✨ **Includes OCI backend improvements**

### 2. Backend Configuration Enhanced

**New Features in `backend.tf`:**
```hcl
terraform {
  backend "oci" {
    # ✅ State locking (NEW in 1.14+)
    enable_locking = true
    
    # ✅ Organized state file path
    key = "production/kubernetes-cluster/terraform.tfstate"
    
    # ✅ Optional KMS encryption support
    # kms_key_id = "ocid1.key..."
  }
}
```

## 🔐 Benefits of OCI Backend

| Feature | Benefit |
|---------|---------|
| **Remote State** | Team collaboration - no local state files |
| **State Locking** | Prevents concurrent modifications |
| **Versioning** | OCI Object Storage versioning enabled |
| **Encryption** | State encrypted at rest in OCI |
| **Audit Trail** | OCI logs all state access |
| **Cost Effective** | OCI Object Storage is cheap (~$0.0255/GB/month) |

## 📋 Migration Steps

### Step 1: Verify OCI Object Storage Bucket Exists

```bash
# Check if bucket exists
oci os bucket get --bucket-name terraform-state --namespace bmeduisaz7tv

# If not, create it
oci os bucket create \
  --compartment-id <your-compartment-ocid> \
  --name terraform-state \
  --namespace bmeduisaz7tv
```

### Step 2: Enable Versioning (Recommended)

```bash
# Enable versioning for state history
oci os bucket update \
  --bucket-name terraform-state \
  --namespace bmeduisaz7tv \
  --versioning Enabled
```

### Step 3: Migrate Existing State (If You Have Local State)

**If you have existing `terraform.tfstate` locally:**

```bash
cd terraform

# 1. Backup current state
cp terraform.tfstate terraform.tfstate.backup

# 2. Initialize with new backend (will prompt to migrate)
terraform init -upgrade

# Question: Do you want to copy existing state to the new backend?
# Answer: yes

# 3. Verify state is now remote
terraform state list

# 4. Delete local state (now in OCI)
rm terraform.tfstate terraform.tfstate.backup
```

**If you already have state in OCI:**
```bash
cd terraform
terraform init -upgrade
# Will detect backend changes and update
```

### Step 4: Test the Pipeline

```bash
# Make a small change
echo "# Test backend" >> terraform/variables.tf
git add terraform/
git commit -m "feat: upgrade to terraform 1.14 with OCI backend"
git push origin main

# Watch pipeline
gh run watch

# Expected results:
# ✅ validate
# ✅ security-scan
# ✅ plan-production (reads state from OCI)
# ⏸️ apply (waiting for approval)
```

## 🔍 Verify Backend Configuration

### Check State is in OCI

```bash
# List objects in bucket
oci os object list \
  --bucket-name terraform-state \
  --namespace bmeduisaz7tv

# Should show:
# production/kubernetes-cluster/terraform.tfstate
```

### Check State Locking Works

```bash
# Terminal 1: Run plan (acquires lock)
cd terraform
terraform plan

# Terminal 2: Try to run plan (should fail with lock error)
cd terraform
terraform plan
# Error: Error acquiring the state lock
# Lock Info:
#   ID:        <lock-id>
#   Operation: OperationTypePlan
#   Created:   2026-02-22 12:34:56 UTC
```

## 🚀 New Capabilities

### 1. State Locking (Prevents Conflicts)

**Before (v1.5.0):**
- No locking - concurrent applies could corrupt state
- Manual coordination required

**After (v1.14.0):**
```bash
# Automatic locking on:
terraform plan    # Acquires read lock
terraform apply   # Acquires write lock

# Lock automatically released when done
```

### 2. Enhanced Error Messages

```bash
# Better error handling for backend issues
terraform init
# ✅ Clear messages for:
# - Bucket not found
# - Insufficient permissions
# - Network issues
```

### 3. State Encryption with KMS (Optional)

**To enable KMS encryption:**

1. Create KMS key in OCI:
```bash
oci kms management key create \
  --compartment-id <compartment-ocid> \
  --display-name "Terraform State Encryption Key" \
  --key-shape '{"algorithm":"AES","length":32}'
```

2. Update `backend.tf`:
```hcl
backend "oci" {
  # ... existing config ...
  kms_key_id = "ocid1.key.oc1.ap-mumbai-1.xxxxx"
}
```

3. Re-initialize:
```bash
terraform init -reconfigure
```

## 🛡️ Security Best Practices

### 1. Bucket Permissions

**Recommended IAM Policy:**
```hcl
Allow group DevOpsTeam to manage objects in compartment terraform-state where all {
  request.bucket.name = 'terraform-state'
}

Allow group DevOpsTeam to inspect buckets in compartment terraform-state
```

### 2. Enable Object Lifecycle

```bash
# Cleanup old state versions after 90 days
oci os object-lifecycle-policy put \
  --bucket-name terraform-state \
  --namespace bmeduisaz7tv \
  --items '[{
    "name": "delete-old-versions",
    "action": "DELETE",
    "timeAmount": 90,
    "timeUnit": "DAYS",
    "isEnabled": true,
    "objectNameFilter": {
      "inclusionPrefixes": ["production/"]
    }
  }]'
```

### 3. Enable Bucket Logging

```bash
# Track all state access
oci os bucket update \
  --bucket-name terraform-state \
  --namespace bmeduisaz7tv \
  --logging-enabled true
```

## 🔄 Pipeline Impact

### What Changed in GitHub Actions

**Before (v1.5.0):**
- Local state management
- No locking
- Risk of conflicts

**After (v1.14.0):**
- ✅ Remote state in OCI Object Storage
- ✅ Automatic state locking
- ✅ Team collaboration enabled
- ✅ State versioning
- ✅ Better error handling

### Pipeline Behavior

**On PR:**
```
1. Validate (no backend)
2. Security Scan
3. Plan (reads remote state from OCI) ← Changed
4. Comment plan on PR
```

**On Push to main:**
```
1. Validate
2. Security Scan
3. Plan Production (reads remote state) ← Changed
4. ⏸️ Manual Approval
5. Apply (updates remote state with lock) ← Changed
```

## 📊 State Management Commands

### View State

```bash
# List all resources in state
terraform state list

# Show specific resource
terraform state show oci_core_instance.k8s_control_plane

# Pull state to local for inspection
terraform state pull > state.json
cat state.json | jq .
```

### State Operations

```bash
# Move resource in state
terraform state mv oci_core_instance.old oci_core_instance.new

# Remove resource from state (doesn't delete actual resource)
terraform state rm oci_core_instance.decommissioned

# Import existing resource
terraform import oci_core_instance.new ocid1.instance.xxx
```

## 🆘 Troubleshooting

### Issue: "Backend configuration changed"

**Error:**
```
Error: Backend configuration changed
A change in the backend configuration has been detected
```

**Solution:**
```bash
terraform init -reconfigure
```

### Issue: "Error acquiring state lock"

**Error:**
```
Error: Error acquiring the state lock
Lock Info: ID: xxx, Operation: OperationTypePlan
```

**Solution:**
```bash
# Force unlock (ONLY if you're sure no one else is running terraform)
terraform force-unlock <lock-id>

# Or wait for lock to expire (usually 20 minutes)
```

### Issue: "Bucket not found"

**Error:**
```
Error: Bucket terraform-state not found
```

**Solution:**
```bash
# Create the bucket
oci os bucket create \
  --compartment-id <compartment-ocid> \
  --name terraform-state \
  --namespace bmeduisaz7tv
```

### Issue: "Insufficient permissions"

**Error:**
```
Error: Service error:NotAuthorized
```

**Solution:**
```bash
# Verify IAM policy grants object access
oci iam policy list --compartment-id <root-compartment>

# Add missing permissions
```

## 📚 Additional Resources

- [Terraform OCI Backend Docs](https://developer.hashicorp.com/terraform/language/settings/backends/oci)
- [OCI Object Storage](https://docs.oracle.com/en-us/iaas/Content/Object/home.htm)
- [State Locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [OCI KMS](https://docs.oracle.com/en-us/iaas/Content/KeyManagement/home.htm)

## ✅ Verification Checklist

- [ ] Terraform upgraded to 1.14.0 in pipeline
- [ ] OCI bucket `terraform-state` exists
- [ ] Bucket versioning enabled
- [ ] State successfully migrated to OCI
- [ ] State locking tested and working
- [ ] Pipeline runs successfully with remote state
- [ ] Team members can access shared state
- [ ] Backup/restore procedures documented
- [ ] IAM policies configured correctly
- [ ] Optional: KMS encryption enabled

---

Your infrastructure state is now properly managed with OCI backend! 🎉
