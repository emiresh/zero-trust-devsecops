locals {
  common_instance_config = {
    availability_domain = var.availability_domain
    compartment_id      = var.compartment_id
    shape               = var.instance_shape
    fault_domain        = "FAULT-DOMAIN-1"

    availability_config = {
      is_live_migration_preferred = false
      recovery_action             = "RESTORE_INSTANCE"
    }

    source_details = {
      source_id                       = var.instance_image_id
      source_type                     = "image"
      boot_volume_size_in_gbs         = var.boot_volume_size_gbs
      boot_volume_vpus_per_gb         = 10
      is_preserve_boot_volume_enabled = false
    }

    launch_options = {
      boot_volume_type                    = "PARAVIRTUALIZED"
      firmware                            = "UEFI_64"
      is_consistent_volume_naming_enabled = true
      is_pv_encryption_in_transit_enabled = true
      network_type                        = "PARAVIRTUALIZED"
      remote_data_volume_type             = "PARAVIRTUALIZED"
    }
  }
}

resource "oci_core_instance" "control_plane" {
  compartment_id      = local.common_instance_config.compartment_id
  availability_domain = local.common_instance_config.availability_domain
  display_name        = "control-plane"
  shape               = local.common_instance_config.shape
  fault_domain        = local.common_instance_config.fault_domain

  availability_config {
    is_live_migration_preferred = local.common_instance_config.availability_config.is_live_migration_preferred
    recovery_action             = local.common_instance_config.availability_config.recovery_action
  }

  shape_config {
    ocpus         = var.control_plane_ocpus
    memory_in_gbs = var.control_plane_memory_gbs
  }

  source_details {
    source_id                       = local.common_instance_config.source_details.source_id
    source_type                     = local.common_instance_config.source_details.source_type
    boot_volume_size_in_gbs         = local.common_instance_config.source_details.boot_volume_size_in_gbs
    boot_volume_vpus_per_gb         = local.common_instance_config.source_details.boot_volume_vpus_per_gb
    is_preserve_boot_volume_enabled = local.common_instance_config.source_details.is_preserve_boot_volume_enabled
  }

  create_vnic_details {
    subnet_id              = oci_core_subnet.public_subnet.id
    assign_public_ip       = true
    skip_source_dest_check = true
    display_name           = "control-plane-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  launch_options {
    boot_volume_type                    = local.common_instance_config.launch_options.boot_volume_type
    firmware                            = local.common_instance_config.launch_options.firmware
    is_consistent_volume_naming_enabled = local.common_instance_config.launch_options.is_consistent_volume_naming_enabled
    is_pv_encryption_in_transit_enabled = local.common_instance_config.launch_options.is_pv_encryption_in_transit_enabled
    network_type                        = local.common_instance_config.launch_options.network_type
    remote_data_volume_type             = local.common_instance_config.launch_options.remote_data_volume_type
  }

  lifecycle {
    ignore_changes = [create_vnic_details[0].display_name, defined_tags, freeform_tags]
  }
}

resource "oci_core_instance" "worker_1" {
  compartment_id      = local.common_instance_config.compartment_id
  availability_domain = local.common_instance_config.availability_domain
  display_name        = "worker-1"
  shape               = local.common_instance_config.shape
  fault_domain        = local.common_instance_config.fault_domain

  availability_config {
    is_live_migration_preferred = local.common_instance_config.availability_config.is_live_migration_preferred
    recovery_action             = local.common_instance_config.availability_config.recovery_action
  }

  shape_config {
    ocpus         = var.worker_ocpus
    memory_in_gbs = var.worker_memory_gbs
  }

  source_details {
    source_id                       = local.common_instance_config.source_details.source_id
    source_type                     = local.common_instance_config.source_details.source_type
    boot_volume_size_in_gbs         = local.common_instance_config.source_details.boot_volume_size_in_gbs
    boot_volume_vpus_per_gb         = local.common_instance_config.source_details.boot_volume_vpus_per_gb
    is_preserve_boot_volume_enabled = local.common_instance_config.source_details.is_preserve_boot_volume_enabled
  }

  create_vnic_details {
    subnet_id              = oci_core_subnet.private_subnet.id
    assign_public_ip       = false
    skip_source_dest_check = false
    display_name           = "worker-1-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  launch_options {
    boot_volume_type                    = local.common_instance_config.launch_options.boot_volume_type
    firmware                            = local.common_instance_config.launch_options.firmware
    is_consistent_volume_naming_enabled = local.common_instance_config.launch_options.is_consistent_volume_naming_enabled
    is_pv_encryption_in_transit_enabled = local.common_instance_config.launch_options.is_pv_encryption_in_transit_enabled
    network_type                        = local.common_instance_config.launch_options.network_type
    remote_data_volume_type             = local.common_instance_config.launch_options.remote_data_volume_type
  }

  lifecycle {
    ignore_changes = [create_vnic_details[0].display_name, defined_tags, freeform_tags]
  }
}

resource "oci_core_instance" "worker_2" {
  compartment_id      = local.common_instance_config.compartment_id
  availability_domain = local.common_instance_config.availability_domain
  display_name        = "worker-2"
  shape               = local.common_instance_config.shape
  fault_domain        = local.common_instance_config.fault_domain

  availability_config {
    is_live_migration_preferred = local.common_instance_config.availability_config.is_live_migration_preferred
    recovery_action             = local.common_instance_config.availability_config.recovery_action
  }

  shape_config {
    ocpus         = var.worker_ocpus
    memory_in_gbs = var.worker_memory_gbs
  }

  source_details {
    source_id                       = local.common_instance_config.source_details.source_id
    source_type                     = local.common_instance_config.source_details.source_type
    boot_volume_size_in_gbs         = local.common_instance_config.source_details.boot_volume_size_in_gbs
    boot_volume_vpus_per_gb         = local.common_instance_config.source_details.boot_volume_vpus_per_gb
    is_preserve_boot_volume_enabled = local.common_instance_config.source_details.is_preserve_boot_volume_enabled
  }

  create_vnic_details {
    subnet_id              = oci_core_subnet.private_subnet.id
    assign_public_ip       = false
    skip_source_dest_check = false
    display_name           = "worker-2-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  launch_options {
    boot_volume_type                    = local.common_instance_config.launch_options.boot_volume_type
    firmware                            = local.common_instance_config.launch_options.firmware
    is_consistent_volume_naming_enabled = local.common_instance_config.launch_options.is_consistent_volume_naming_enabled
    is_pv_encryption_in_transit_enabled = local.common_instance_config.launch_options.is_pv_encryption_in_transit_enabled
    network_type                        = local.common_instance_config.launch_options.network_type
    remote_data_volume_type             = local.common_instance_config.launch_options.remote_data_volume_type
  }

  lifecycle {
    ignore_changes = [create_vnic_details[0].display_name, defined_tags, freeform_tags]
  }
}
