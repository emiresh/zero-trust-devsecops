# VCN Outputs
output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.main_vcn.id
}

output "vcn_cidr" {
  description = "CIDR block of the VCN"
  value       = oci_core_vcn.main_vcn.cidr_block
}

# Subnet Outputs
output "public_subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.public_subnet.id
}

output "private_subnet_id" {
  description = "OCID of the private subnet"
  value       = oci_core_subnet.private_subnet.id
}

# Instance Outputs
output "control_plane_public_ip" {
  description = "Public IP of the control plane instance"
  value       = oci_core_instance.control_plane.public_ip
}

output "control_plane_private_ip" {
  description = "Private IP of the control plane instance"
  value       = oci_core_instance.control_plane.private_ip
}

output "worker_1_private_ip" {
  description = "Private IP of worker-1 instance"
  value       = oci_core_instance.worker_1.private_ip
}

output "worker_2_private_ip" {
  description = "Private IP of worker-2 instance"
  value       = oci_core_instance.worker_2.private_ip
}

output "instance_ids" {
  description = "Map of instance names to OCIDs"
  value = {
    control_plane = oci_core_instance.control_plane.id
    worker_1      = oci_core_instance.worker_1.id
    worker_2      = oci_core_instance.worker_2.id
  }
}

# Load Balancer Outputs
output "load_balancer_id" {
  description = "OCID of the load balancer"
  value       = oci_load_balancer_load_balancer.main_lb.id
}

output "load_balancer_ip" {
  description = "IP addresses of the load balancer"
  value       = oci_load_balancer_load_balancer.main_lb.ip_address_details
}

# Network Gateway Outputs
output "internet_gateway_id" {
  description = "OCID of the internet gateway"
  value       = oci_core_internet_gateway.igw.id
}

# SSH Connection String
output "ssh_to_control_plane" {
  description = "SSH command to connect to control plane"
  value       = "ssh -i <your-private-key> opc@${oci_core_instance.control_plane.public_ip}"
}
