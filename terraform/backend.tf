terraform {
  required_version = ">= 1.14.0"

  backend "oci" {
    # Object Storage configuration
    bucket    = "terraform-state"
    namespace = "bmeduisaz7tv"
    region    = "ap-mumbai-1"
    
    # State file path (organize by environment)
    key = "terraform.tfstate"

    # Authentication (uses OCI config from pipeline)
    config_file_profile = "DEFAULT"
    auth                = "APIKey"
    
    # Optional: Enable state encryption with OCI KMS
    # Uncomment and set your KMS key OCID for enhanced security
    # kms_key_id = "ocid1.key.oc1.ap-mumbai-1.xxxxxx"
  }
  
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "8.2.0"
    }
  }
}