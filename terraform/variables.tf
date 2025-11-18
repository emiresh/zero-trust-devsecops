# ==========================================
# OCI Authentication Variables
# ==========================================

variable "tenancy_ocid" {
  description = "OCID of your tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the user calling the API"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint for the key pair being used"
  type        = string
}

variable "private_key_path" {
  description = "Path to your private key file"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "Oracle Cloud region"
  type        = string
  default     = "ap-mumbai-1"
}

# ==========================================
# Compartment Variables
# ==========================================

variable "compartment_id" {
  description = "OCID of the compartment where resources will be created"
  type        = string
}

# ==========================================
# Network Variables
# ==========================================

variable "vcn_cidr_block" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr_block" {
  description = "CIDR block for the subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "allowed_ssh_cidrs" {
  description = "List of CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allowed_k8s_api_cidrs" {
  description = "List of CIDR blocks allowed to access Kubernetes API"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ==========================================
# Compute Instance Variables
# ==========================================

variable "instance_name" {
  description = "Display name for the compute instance"
  type        = string
  default     = "k8s-node"
}

variable "instance_shape" {
  description = "Shape of the compute instance"
  type        = string
  default     = "VM.Standard.A1.Flex"
  
  validation {
    condition     = can(regex("^VM\\.Standard\\.A1\\.Flex$|^VM\\.Standard\\.E", var.instance_shape))
    error_message = "Instance shape must be a valid OCI shape"
  }
}

variable "instance_ocpus" {
  description = "Number of OCPUs for flex instances"
  type        = number
  default     = 2
  
  validation {
    condition     = var.instance_ocpus >= 1 && var.instance_ocpus <= 4
    error_message = "OCPUs must be between 1 and 4 for free tier"
  }
}

variable "instance_memory_gb" {
  description = "Amount of memory in GB for flex instances"
  type        = number
  default     = 12
  
  validation {
    condition     = var.instance_memory_gb >= 1 && var.instance_memory_gb <= 24
    error_message = "Memory must be between 1 and 24 GB for free tier"
  }
}

variable "boot_volume_size_gb" {
  description = "Size of boot volume in GB"
  type        = number
  default     = 100
  
  validation {
    condition     = var.boot_volume_size_gb >= 50 && var.boot_volume_size_gb <= 200
    error_message = "Boot volume size must be between 50 and 200 GB"
  }
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
}

# ==========================================
# Operating System Variables
# ==========================================

variable "os_image_name" {
  description = "Operating system image name (e.g., 'Canonical Ubuntu')"
  type        = string
  default     = "Canonical Ubuntu"
}

variable "os_version" {
  description = "Operating system version"
  type        = string
  default     = "22.04"
}

# ==========================================
# Tags and Metadata
# ==========================================

variable "freeform_tags" {
  description = "Free-form tags for resources"
  type        = map(string)
  default = {
    "Environment" = "production"
    "Project"     = "FreshBonds"
    "ManagedBy"   = "Terraform"
  }
}

variable "defined_tags" {
  description = "Defined tags for resources (namespace.key = value)"
  type        = map(string)
  default     = {}
}

# ==========================================
# Cloud-Init Configuration
# ==========================================

variable "install_k3s" {
  description = "Whether to install K3s on the instance"
  type        = bool
  default     = false
}

variable "install_monitoring" {
  description = "Whether to install monitoring agents"
  type        = bool
  default     = true
}

variable "install_docker" {
  description = "Whether to install Docker"
  type        = bool
  default     = true
}

# ==========================================
# Storage Variables
# ==========================================

variable "create_data_volume" {
  description = "Whether to create an additional data volume"
  type        = bool
  default     = false
}

variable "data_volume_size_gb" {
  description = "Size of data volume in GB"
  type        = number
  default     = 50
}
