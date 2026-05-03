output "site_bucket_name" {
  description = "S3 bucket used for static site files."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID used by the deploy script."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Primary URL for the site."
  value       = local.has_custom_domain ? "https://${var.custom_domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}
