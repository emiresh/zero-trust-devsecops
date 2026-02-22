# ⚠️ TEST FILE - INTENTIONAL SECURITY ISSUES FOR PIPELINE TESTING
# This file contains deliberate security misconfigurations to test Checkov scanning
# DELETE THIS FILE after testing!

# ISSUE 1: Wide-open security rule allowing all traffic from internet
resource "oci_core_security_list" "insecure_test" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "test-insecure-security-list"

  # BAD: Allows all inbound traffic from internet
  ingress_security_rules {
    protocol    = "all"  # All protocols
    source      = "0.0.0.0/0"  # From anywhere
    source_type = "CIDR_BLOCK"
    stateless   = false
    description = "INSECURE: Allow all traffic from internet"
  }

  # BAD: RDP port open to internet
  ingress_security_rules {
    protocol    = "6"  # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false
    
    tcp_options {
      max = 3389  # RDP port
      min = 3389
    }
    description = "INSECURE: RDP open to internet"
  }

  # BAD: Database port (PostgreSQL) open to internet
  ingress_security_rules {
    protocol    = "6"  # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false
    
    tcp_options {
      max = 5432  # PostgreSQL
      min = 5432
    }
    description = "INSECURE: Database port open to internet"
  }

  # BAD: MySQL port open to internet
  ingress_security_rules {
    protocol    = "6"  # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false
    
    tcp_options {
      max = 3306  # MySQL
      min = 3306
    }
    description = "INSECURE: MySQL port open to internet"
  }
}

# ISSUE 2: Instance without encryption
resource "oci_core_volume" "insecure_volume" {
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  display_name        = "test-insecure-volume"
  size_in_gbs         = 50
  
  # BAD: No KMS key specified - using Oracle-managed encryption only
  # kms_key_id = "missing"
}

# ISSUE 3: Hard-coded secret (Checkov will catch this)
variable "test_insecure_password" {
  type        = string
  default     = "SuperSecret123!"  # BAD: Hard-coded password
  description = "INSECURE: Hard-coded password"
  sensitive   = false  # BAD: Should be true for passwords
}

# ISSUE 4: Instance with public IP and permissive security
resource "oci_core_instance" "test_insecure_instance" {
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  display_name        = "test-insecure-instance"
  shape               = var.instance_shape

  shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }

  source_details {
    source_id   = var.instance_image_id
    source_type = "image"
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public_subnet.id
    assign_public_ip = true  # BAD: Public IP without proper security
  }
  
  # BAD: No metadata for security monitoring add
  # metadata = {}
}
# ISSUE 5: S3 bucket without encryption (Generic Terraform - Checkov will catch)  
resource "aws_s3_bucket" "test_insecure_bucket" {
  bucket = "test-insecure-bucket-${random_id.bucket_id.hex}"
  
  # Missing: server_side_encryption_configuration
  # Missing: versioning
  # Missing: logging
  
  tags = {
    Name        = "insecure-test-bucket"
    Environment = "test"
  }
}

resource "random_id" "bucket_id" {
  byte_length = 8
}

# ISSUE 6: S3 bucket with public access
resource "aws_s3_bucket_public_access_block" "test_public" {
  bucket = aws_s3_bucket.test_insecure_bucket.id
  
  block_public_acls       = false  # BAD: Should be true
  block_public_policy     = false  # BAD: Should be true
  ignore_public_acls      = false  # BAD: Should be true
  restrict_public_buckets = false  # BAD: Should be true
}

# ISSUE 7: Security group with overly permissive rules
resource "aws_security_group" "test_insecure_sg" {
  name        = "test-insecure-sg"
  description = "Insecure security group for testing"
  
  # BAD: SSH from anywhere
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "INSECURE: SSH from anywhere"
  }
  
  # BAD: All traffic outbound (too permissive)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "INSECURE: All traffic allowed outbound"
  }
}