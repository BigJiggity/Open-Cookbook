# Infrastructure

The open version deploys only a static website:

- S3 private site bucket
- CloudFront distribution
- CloudFront origin access control
- Optional ACM certificate in `us-east-1`
- Optional Route 53 `A` and `AAAA` alias records

There is no database, authentication service, API, edge firewall, management portal, email system, media bucket, analytics pipeline, promotional system, or scheduled backup system.

## Deploy

From the repository root:

```bash
node scripts/setup.mjs
cd infrastructure/terraform
terraform init
terraform apply
cd ../..
./scripts/deploy.sh
```

## Cost

For light personal traffic, monthly AWS cost should usually be near the CloudFront, S3 storage, request, Route 53 hosted zone, and DNS query minimums. Without a custom Route 53 hosted zone, an idle deployment should generally be under a few dollars per month. With a hosted zone, include the hosted zone monthly charge.
