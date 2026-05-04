# Azure Infrastructure

This configuration creates:

- Azure resource group
- Storage account static website for the frontend
- Azure Table Storage table for cookbook data
- Linux Azure Function App for the `GET` and `PUT` cookbook API

Deploy:

```bash
cd infrastructure/azure/terraform
terraform init
terraform apply
cd ../../..
./scripts/deploy-azure.sh
```
