# Terraform Static Site

This Terraform configuration creates the static hosting infrastructure for Open Cookbook.

## Inputs

- `aws_region`: AWS region for S3 and Route 53 lookups.
- `site_bucket_name`: globally unique S3 bucket name.
- `custom_domain_name`: optional domain name such as `cookbook.example.com`.
- `route53_zone_id`: optional hosted zone ID used when `custom_domain_name` is set.

## Commands

```bash
terraform init
terraform plan
terraform apply
```

After apply:

```bash
cd ../..
./scripts/deploy.sh
```

## Outputs

- `site_bucket_name`
- `cloudfront_distribution_id`
- `cloudfront_domain_name`
- `site_url`
