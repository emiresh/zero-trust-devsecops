output "instance_id" {
  description = "OCID of the created instance"
  value       = oci_core_instance.main.id
}

output "instance_name" {
  description = "Display name of the instance"
  value       = oci_core_instance.main.display_name
}

output "instance_public_ip" {
  description = "Public IP address of the instance"
  value       = oci_core_instance.main.public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the instance"
  value       = oci_core_instance.main.private_ip
}

output "instance_state" {
  description = "Current state of the instance"
  value       = oci_core_instance.main.state
}

output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.main.id
}

output "subnet_id" {
  description = "OCID of the subnet"
  value       = oci_core_subnet.main.id
}

output "nsg_id" {
  description = "OCID of the Network Security Group"
  value       = oci_core_network_security_group.main.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh ubuntu@${oci_core_instance.main.public_ip}"
}

output "availability_domain" {
  description = "Availability domain of the instance"
  value       = data.oci_identity_availability_domain.ad.name
}

output "image_id" {
  description = "OCID of the OS image used"
  value       = data.oci_core_images.ubuntu_arm.images[0].id
}

output "image_name" {
  description = "Name of the OS image used"
  value       = data.oci_core_images.ubuntu_arm.images[0].display_name
}

output "data_volume_id" {
  description = "OCID of the data volume (if created)"
  value       = var.create_data_volume ? oci_core_volume.data[0].id : null
}

# Output connection details in a formatted way
output "connection_details" {
  description = "Connection details for the instance"
  value = {
    public_ip  = oci_core_instance.main.public_ip
    private_ip = oci_core_instance.main.private_ip
    ssh        = "ssh ubuntu@${oci_core_instance.main.public_ip}"
    instance_name = oci_core_instance.main.display_name
  }
}

# Output useful URLs
output "console_url" {
  description = "OCI Console URL for the instance"
  value       = "https://cloud.oracle.com/compute/instances/${oci_core_instance.main.id}?region=${var.region}"
}
