# Infrastructure

The open version supports three backend storage targets.

## AWS

The AWS path deploys:

- S3 private site bucket
- CloudFront distribution
- CloudFront origin access control
- DynamoDB cookbook storage table
- Lambda cookbook API
- API Gateway HTTP API
- Optional ACM certificate in `us-east-1`
- Optional Route 53 `A` and `AAAA` alias records

## Azure

The Azure path deploys:

- Azure Storage static website
- Azure Table Storage cookbook table
- Linux Azure Function App cookbook API

## Local Server

The local path runs Apache, PHP, and MariaDB. MariaDB stores the cookbook document as JSON in an open-source backend.

There is no authentication service, edge firewall, management portal, email system, media bucket, analytics pipeline, promotional system, or scheduled backup system.

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

For light personal traffic, monthly AWS cost should usually be near the CloudFront, S3, DynamoDB on-demand, Lambda, API Gateway, request, Route 53 hosted zone, and DNS query minimums. Azure cost depends on Storage Account, Table Storage, and Functions consumption usage. Local hosting cost is whatever the server and network cost to operate.
