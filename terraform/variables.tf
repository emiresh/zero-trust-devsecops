variable "compartment_id" {
  description = "The OCID of the compartment where resources will be created"
  type        = string
}

variable "region" {
  description = "The OCI region"
  type        = string
  default     = "ap-mumbai-1"
}

variable "availability_domain" {
  description = "The availability domain for compute instances"
  type        = string
  default     = "CefH:AP-MUMBAI-1-AD-1"
}

variable "vcn_cidr" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "vcn_name" {
  description = "Display name for the VCN"
  type        = string
  default     = "vcn-20250929-1819"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.0.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_shape" {
  description = "Shape for compute instances"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_image_id" {
  description = "OCID of the image to use for compute instances"
  type        = string
  default     = "ocid1.image.oc1.ap-mumbai-1.aaaaaaaai7dlw5yiaxmzks5hn2dgcijmk56svkw64wgwzs53f6dejhhykssa"
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
  sensitive   = true
}

variable "control_plane_ocpus" {
  description = "Number of OCPUs for control plane instance"
  type        = number
  default     = 2
}

variable "control_plane_memory_gbs" {
  description = "Memory in GBs for control plane instance"
  type        = number
  default     = 8
}

variable "worker_ocpus" {
  description = "Number of OCPUs for worker instances"
  type        = number
  default     = 1
}

variable "worker_memory_gbs" {
  description = "Memory in GBs for worker instances"
  type        = number
  default     = 8
}

variable "boot_volume_size_gbs" {
  description = "Boot volume size in GBs"
  type        = number
  default     = 47
}

variable "lb_min_bandwidth_mbps" {
  description = "Minimum bandwidth for load balancer in Mbps"
  type        = number
  default     = 10
}

variable "lb_max_bandwidth_mbps" {
  description = "Maximum bandwidth for load balancer in Mbps"
  type        = number
  default     = 10
}
