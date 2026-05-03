variable "aws_region" {
  description = "AWS region for S3. CloudFront ACM certificates are always requested in us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "site_bucket_name" {
  description = "Globally unique S3 bucket name for the static website files."
  type        = string
}

variable "custom_domain_name" {
  description = "Optional custom DNS name for the site, for example cookbook.example.com."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Optional Route 53 hosted zone ID for the custom domain."
  type        = string
  default     = ""
}
