resource "oci_core_vcn" "main_vcn" {
  compartment_id = var.compartment_id
  cidr_block     = var.vcn_cidr
  display_name   = var.vcn_name

  lifecycle {
    ignore_changes = [dns_label, defined_tags, freeform_tags]
  }
}