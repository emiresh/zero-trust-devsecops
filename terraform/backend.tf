terraform {
  backend "oci" {
    bucket    = "terraform-state"
    namespace = "bmeduisaz7tv"
    region    = "ap-mumbai-1"

    # Use your existing OCI CLI config
    config_file_profile = "DEFAULT"
    auth                = "APIKey"
  }
}