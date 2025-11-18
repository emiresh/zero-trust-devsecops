terraform {
  required_version = ">= 1.0"
  
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
  
  # Optional: Use OCI Object Storage as backend for state
  # Uncomment and configure after creating bucket
  # backend "s3" {
  #   bucket                      = "terraform-state"
  #   key                         = "freshbonds/terraform.tfstate"
  #   region                      = "ap-mumbai-1"
  #   endpoint                    = "https://NAMESPACE.compat.objectstorage.ap-mumbai-1.oraclecloud.com"
  #   shared_credentials_file     = "~/.oci/config"
  #   skip_region_validation      = true
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   force_path_style            = true
  # }
}
