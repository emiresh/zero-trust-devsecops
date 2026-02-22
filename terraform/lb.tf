resource "oci_load_balancer_load_balancer" "main_lb" {
  compartment_id = var.compartment_id
  display_name   = "lb_2025-1006-1131"

  shape      = "flexible"
  is_private = false
  ip_mode    = "IPV4"

  subnet_ids = [
    oci_core_subnet.public_subnet.id
  ]

  is_request_id_enabled = true
  request_id_header     = "X-Request-Id"

  network_security_group_ids = []

  shape_details {
    minimum_bandwidth_in_mbps = var.lb_min_bandwidth_mbps
    maximum_bandwidth_in_mbps = var.lb_max_bandwidth_mbps
  }

  lifecycle {
    ignore_changes = [
      defined_tags,
      freeform_tags
    ]
  }
}