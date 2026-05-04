# Azure Backend

The Azure backend stores the single cookbook document in Azure Table Storage and exposes it with Azure Functions.

Terraform creates:

- Storage Account
- Table Storage table
- Linux Function App

The frontend receives the API URL through generated `site-config.js` during `scripts/deploy-azure.sh`.
