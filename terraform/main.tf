# ==========================================
# Data Sources
# ==========================================

# Get availability domain
data "oci_identity_availability_domain" "ad" {
  compartment_id = var.tenancy_ocid
  ad_number      = 1
}

# Get latest Ubuntu ARM image
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_id
  operating_system         = var.os_image_name
  operating_system_version = var.os_version
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# ==========================================
# VCN (Virtual Cloud Network)
# ==========================================

resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  cidr_blocks    = [var.vcn_cidr_block]
  display_name   = "${var.instance_name}-vcn"
  dns_label      = "freshbonds"
  
  freeform_tags = var.freeform_tags
  defined_tags  = var.defined_tags
}

# Internet Gateway
resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.instance_name}-igw"
  enabled        = true
  
  freeform_tags = var.freeform_tags
}

# Route Table
resource "oci_core_route_table" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.instance_name}-rt"
  
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
  
  freeform_tags = var.freeform_tags
}

# ==========================================
# Network Security Group
# ==========================================

resource "oci_core_network_security_group" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.instance_name}-nsg"
  
  freeform_tags = var.freeform_tags
}

# SSH Access
resource "oci_core_network_security_group_security_rule" "ssh" {
  network_security_group_id = oci_core_network_security_group.main.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  
  description = "Allow SSH from specified CIDRs"
  source_type = "CIDR_BLOCK"
  source      = var.allowed_ssh_cidrs[0]
  stateless   = true
  
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# HTTP Access
resource "oci_core_network_security_group_security_rule" "http" {
  network_security_group_id = oci_core_network_security_group.main.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  
  description = "Allow HTTP traffic"
  source_type = "CIDR_BLOCK"
  source      = "0.0.0.0/0"
  stateless   = true
  
  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

# HTTPS Access
resource "oci_core_network_security_group_security_rule" "https" {
  network_security_group_id = oci_core_network_security_group.main.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  
  description = "Allow HTTPS traffic"
  source_type = "CIDR_BLOCK"
  source      = "0.0.0.0/0"
  stateless   = true
  
  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

# Kubernetes API Server
resource "oci_core_network_security_group_security_rule" "k8s_api" {
  network_security_group_id = oci_core_network_security_group.main.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  
  description = "Allow Kubernetes API access"
  source_type = "CIDR_BLOCK"
  source      = var.allowed_k8s_api_cidrs[0]
  stateless   = true
  
  tcp_options {
    destination_port_range {
      min = 6443
      max = 6443
    }
  }
}

# NodePort Range
resource "oci_core_network_security_group_security_rule" "nodeport" {
  network_security_group_id = oci_core_network_security_group.main.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  
  description = "Allow NodePort range"
  source_type = "CIDR_BLOCK"
  source      = "0.0.0.0/0"
  stateless   = true
  
  tcp_options {
    destination_port_range {
      min = 30000
      max = 32767
    }
  }
}

# Allow all egress
resource "oci_core_network_security_group_security_rule" "egress_all" {
  network_security_group_id = oci_core_network_security_group.main.id
  direction                 = "EGRESS"
  protocol                  = "6" # TCP only for security
  
  description      = "Allow TCP outbound traffic"
  destination_type = "CIDR_BLOCK"
  destination      = "0.0.0.0/0"
  stateless        = true
  
  tcp_options {
    # Allow all TCP ports except RDP (3389) for security
    source_port_range {
      min = 1
      max = 65535
    }
  }
}

# ==========================================
# Subnet
# ==========================================

resource "oci_core_subnet" "main" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = var.subnet_cidr_block
  display_name      = "${var.instance_name}-subnet"
  dns_label         = "compute"
  route_table_id    = oci_core_route_table.main.id
  security_list_ids = []
  
  prohibit_public_ip_on_vnic = false
  
  freeform_tags = var.freeform_tags
}

# ==========================================
# Compute Instance
# ==========================================

resource "oci_core_instance" "main" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domain.ad.name
  display_name        = var.instance_name
  shape               = var.instance_shape
  
  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }
  
  source_details {
    source_type              = "image"
    source_id                = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs  = var.boot_volume_size_gb
  }
  
  # Enable boot volume encryption (CKV_OCI_4)
  launch_options {
    is_pv_encryption_in_transit_enabled = true
  }
  
  # Disable legacy metadata service (CKV_OCI_5)
  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }
  
  create_vnic_details {
    subnet_id        = oci_core_subnet.main.id
    assign_public_ip = true
    display_name     = "${var.instance_name}-vnic"
    hostname_label   = var.instance_name
    nsg_ids          = [oci_core_network_security_group.main.id]
  }
  
  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml", {
      hostname           = var.instance_name
      install_k3s        = var.install_k3s
      install_monitoring = var.install_monitoring
      install_docker     = var.install_docker
    }))
  }
  
  freeform_tags = var.freeform_tags
  defined_tags  = var.defined_tags
  
  lifecycle {
    ignore_changes = [
      source_details[0].source_id,
    ]
  }
}

# ==========================================
# Optional: Data Volume
# ==========================================

resource "oci_core_volume" "data" {
  count = var.create_data_volume ? 1 : 0
  
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domain.ad.name
  display_name        = "${var.instance_name}-data-volume"
  size_in_gbs         = var.data_volume_size_gb
  
  freeform_tags = var.freeform_tags
}

resource "oci_core_volume_attachment" "data" {
  count = var.create_data_volume ? 1 : 0
  
  instance_id     = oci_core_instance.main.id
  volume_id       = oci_core_volume.data[0].id
  attachment_type = "paravirtualized"
  display_name    = "${var.instance_name}-data-attachment"
}
