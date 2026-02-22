resource "oci_core_route_table" "public_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "Public-Subnet-RT"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
    route_type        = "STATIC"
  }

  lifecycle {
    ignore_changes = [defined_tags, freeform_tags]
  }
}
resource "oci_core_route_table" "default_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "Default Route Table for vcn-20250929-1819"

  lifecycle {
    ignore_changes = [route_rules, defined_tags, freeform_tags]
  }
}

resource "oci_core_route_table" "private_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "Private_RT"

  lifecycle {
    ignore_changes = [route_rules, defined_tags, freeform_tags]
  }
}