resource "oci_core_subnet" "public_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main_vcn.id
  cidr_block        = var.public_subnet_cidr
  display_name      = "Public-Subnet"
  route_table_id    = oci_core_route_table.public_rt.id
  security_list_ids = [oci_core_security_list.default_sec_list.id]

  lifecycle {
    ignore_changes = [dns_label, defined_tags, freeform_tags]
  }
}

resource "oci_core_subnet" "private_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main_vcn.id
  cidr_block        = var.private_subnet_cidr
  display_name      = "Private-Subnet"
  route_table_id    = oci_core_route_table.private_rt.id
  security_list_ids = [oci_core_security_list.default_sec_list.id]

  lifecycle {
    ignore_changes = [dns_label, defined_tags, freeform_tags, prohibit_public_ip_on_vnic]
  }
}