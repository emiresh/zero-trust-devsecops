# Oracle Cloud Infrastructure - Compute Instance Module

This Terraform configuration creates a secure compute instance on Oracle Cloud Infrastructure (OCI) suitable for running Kubernetes nodes or application servers.

## Features

- ✅ ARM-based compute instance (Ampere A1)
- ✅ Always Free tier compatible (up to 4 OCPUs, 24GB RAM)
- ✅ Secure networking with NSG (Network Security Group)
- ✅ Public IP with SSH access
- ✅ Automated security hardening
- ✅ Cloud-init for initial setup
- ✅ Block storage configuration

## Prerequisites

1. **OCI Account**: Oracle Cloud account with compartment access
2. **API Keys**: OCI API key pair configured
3. **Terraform**: Version 1.0+

## Quick Start

### 1. Set up OCI credentials

```bash
# Create OCI config directory
mkdir -p ~/.oci

# Generate API key pair
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem

# Upload public key to OCI Console
# User Settings → API Keys → Add API Key
```

### 2. Create terraform.tfvars

```bash
cd terraform/
cp terraform.tfvars.example terraform.tfvars
# Edit with your values
```

### 3. Initialize and Apply

```bash
terraform init
terraform plan
terraform apply
```

## Module Structure

```
terraform/
├── main.tf                 # Main infrastructure configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── provider.tf             # OCI provider configuration
├── terraform.tfvars        # Variable values (gitignored)
├── terraform.tfvars.example # Example configuration
├── versions.tf             # Terraform and provider versions
├── cloud-init.yaml         # Cloud-init configuration
└── README.md              # This file
```

## Configuration

### Main Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `tenancy_ocid` | OCI tenancy OCID | - | Yes |
| `user_ocid` | OCI user OCID | - | Yes |
| `fingerprint` | API key fingerprint | - | Yes |
| `private_key_path` | Path to private key | `~/.oci/oci_api_key.pem` | Yes |
| `region` | OCI region | `ap-mumbai-1` | No |
| `compartment_id` | Compartment OCID | - | Yes |
| `ssh_public_key` | SSH public key for access | - | Yes |
| `instance_name` | Name for compute instance | `k8s-node` | No |
| `instance_shape` | Compute shape | `VM.Standard.A1.Flex` | No |
| `instance_ocpus` | Number of OCPUs | `2` | No |
| `instance_memory_gb` | Memory in GB | `12` | No |
| `boot_volume_size_gb` | Boot volume size | `100` | No |

### Example terraform.tfvars

```hcl
# OCI Authentication
tenancy_ocid      = "ocid1.tenancy.oc1..aaaaaaaa..."
user_ocid         = "ocid1.user.oc1..aaaaaaaa..."
fingerprint       = "12:34:56:78:90:ab:cd:ef:..."
private_key_path  = "~/.oci/oci_api_key.pem"
region            = "ap-mumbai-1"

# Infrastructure
compartment_id    = "ocid1.compartment.oc1..aaaaaaaa..."
ssh_public_key    = "ssh-rsa AAAAB3NzaC1yc2EA..."

# Instance Configuration
instance_name     = "freshbonds-k8s-node-1"
instance_shape    = "VM.Standard.A1.Flex"
instance_ocpus    = 4      # Free tier: up to 4 OCPUs
instance_memory_gb = 24     # Free tier: up to 24 GB
boot_volume_size_gb = 200

# Tags
freeform_tags = {
  "Environment" = "production"
  "Project"     = "FreshBonds"
  "ManagedBy"   = "Terraform"
}
```

## Outputs

After applying, Terraform outputs:

- `instance_public_ip` - Public IP address
- `instance_private_ip` - Private IP address
- `instance_id` - Instance OCID
- `vcn_id` - VCN OCID
- `subnet_id` - Subnet OCID

## Security Features

### Network Security

- Default deny all ingress traffic
- Explicit allow rules for:
  - SSH (port 22) from anywhere
  - HTTP (port 80) from anywhere
  - HTTPS (port 443) from anywhere
  - Kubernetes API (port 6443) from specific CIDR
  - NodePort range (30000-32767) from specific CIDR

### Instance Security

- Cloud-init script automatically:
  - Updates all packages
  - Configures firewall
  - Disables root SSH
  - Sets up fail2ban
  - Configures automatic security updates
  - Installs monitoring agents

### Compliance

- CIS Oracle Cloud Foundation Benchmark compliant
- Encrypted block volumes
- Audit logging enabled
- Resource tagging for compliance

## Scaling

### Add More Instances

```hcl
# Create multiple instances using count
resource "oci_core_instance" "compute" {
  count = 3  # Creates 3 instances
  
  display_name = "${var.instance_name}-${count.index + 1}"
  # ... rest of configuration
}
```

### Add Block Volumes

```hcl
resource "oci_core_volume" "data" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domain.ad.name
  display_name        = "data-volume"
  size_in_gbs         = 100
}

resource "oci_core_volume_attachment" "data_attachment" {
  instance_id     = oci_core_instance.compute.id
  volume_id       = oci_core_volume.data.id
  attachment_type = "paravirtualized"
}
```

## Cost Optimization

### Always Free Tier

Oracle Cloud offers generous Always Free tier:

- **4 ARM-based OCPUs** (Ampere A1)
- **24 GB RAM**
- **200 GB block storage**
- **10 TB outbound data transfer/month**

This configuration stays within free tier by default.

### Cost Monitoring

```bash
# Estimate costs
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan | jq '.resource_changes'
```

## Maintenance

### Update Instance

```bash
# Plan changes
terraform plan

# Apply updates
terraform apply

# Destroy resources
terraform destroy
```

### Backup State

```bash
# Backup state file
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d)

# Use remote backend (recommended)
# See backend configuration in provider.tf
```

## Troubleshooting

### SSH Connection Issues

```bash
# Verify security rules
oci network nsg rules list --nsg-id <nsg-id>

# Check instance status
oci compute instance get --instance-id <instance-id>

# View console connection
oci compute instance-console-connection create --instance-id <instance-id>
```

### Terraform Errors

```bash
# Re-initialize providers
terraform init -upgrade

# Import existing resource
terraform import oci_core_instance.compute <instance-ocid>

# Debug mode
TF_LOG=DEBUG terraform apply
```

## Integration with ArgoCD

After creating the instance:

1. **Install K3s or Kubernetes**
2. **Configure kubectl access**
3. **Install ArgoCD**
4. **Point ArgoCD to your Git repository**

See [K3s Installation Guide](../docs/K3S-SETUP.md) for details.

## Additional Resources

- [OCI Terraform Provider Documentation](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [OCI Best Practices](https://docs.oracle.com/en-us/iaas/Content/GSG/Concepts/baremetalintro.htm)
- [Security Best Practices](https://docs.oracle.com/en-us/iaas/Content/Security/Concepts/security_guide.htm)

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Terraform logs: `TF_LOG=DEBUG terraform apply`
3. Check OCI console for resource status
4. Review cloud-init logs: `ssh user@instance 'sudo cat /var/log/cloud-init-output.log'`
