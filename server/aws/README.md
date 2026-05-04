# AWS Backend

The AWS backend stores the single cookbook document in DynamoDB and exposes it with Lambda through API Gateway.

Terraform creates:

- DynamoDB table
- Lambda execution role and policy
- Python Lambda function
- API Gateway HTTP API

The frontend receives the API URL through generated `site-config.js` during `scripts/deploy.sh`.
