resource "oci_core_security_list" "default_sec_list" {
  #checkov:skip=CKV_OCI_17:Stateful rules required for proper connection tracking
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "Default Security List for vcn-20250929-1819"

  egress_security_rules {
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    protocol         = "all"
    stateless        = false
  }
  egress_security_rules {
    destination      = "10.0.1.0/24"
    destination_type = "CIDR_BLOCK"
    protocol         = "6"
    stateless        = false

    tcp_options {
      max = 30388
      min = 30388
    }
  }
  egress_security_rules {
    destination      = "10.0.1.0/24"
    destination_type = "CIDR_BLOCK"
    protocol         = "6"
    stateless        = false

    tcp_options {
      max = 31143
      min = 31143
    }
  }

  ingress_security_rules {
    protocol    = "1"
    source      = "10.0.0.0/16"
    source_type = "CIDR_BLOCK"
    stateless   = false

    icmp_options {
      code = -1
      type = 3
    }
  }
  ingress_security_rules {
    protocol    = "1"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    icmp_options {
      code = 4
      type = 3
    }
  }
  #checkov:skip=CKV_OCI_19:SSH access from internet required for initial setup
  ingress_security_rules {
    description = "SSH from anywhere (temporary)"
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 22
      min = 22
    }
  }
  ingress_security_rules {
    description = "Kubernetes API Server"
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 6443
      min = 6443
    }
  }
  ingress_security_rules {
    description = "Kubelet API (control plane to workers)"
    protocol    = "6"
    source      = "10.0.0.0/16"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 10250
      min = 10250
    }
  }
  ingress_security_rules {
    description = "etcd server client API"
    protocol    = "6"
    source      = "10.0.0.0/16"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 2380
      min = 2379
    }
  }
  ingress_security_rules {
    description = "kube-scheduler and kube-controller-manager"
    protocol    = "6"
    source      = "10.0.0.0/16"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 10259
      min = 10257
    }
  }
  ingress_security_rules {
    description = "NodePort Services"
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 32767
      min = 30000
    }
  }
  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 31143
      min = 31143
    }
  }
  ingress_security_rules {
    protocol    = "6"
    source      = "10.0.0.0/24"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      max = 31143
      min = 31143
    }
  }
}