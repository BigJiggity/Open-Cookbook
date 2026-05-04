# Open Cookbook

Open Cookbook is a small, single-cookbook recipe website. It keeps the feature set intentionally basic:

- Create, edit, print, and delete recipes.
- Add ingredients, directions, and optional notes.
- Search recipes by name, ingredient, or direction text.
- Store data in a backend API, not browser cache.
- Export and import a JSON backup.
- Deploy to AWS, Azure, or a self-hosted server.

This split intentionally excludes multi-user access, recipe sharing controls, social interaction features, paid-feature hooks, analytics, and original product branding.

## Quick Start

Run the setup helper from the repository root:

```bash
node scripts/setup.mjs
```

The setup helper asks for:

- cookbook title
- deployment target: `aws`, `azure`, or `local`
- provider-specific cloud or server settings

## Deployment Targets

### AWS

AWS deploys:

- S3 private static site bucket
- CloudFront distribution
- DynamoDB cookbook table
- Lambda cookbook API
- API Gateway HTTP API
- optional ACM certificate and Route 53 records

```bash
node scripts/setup.mjs
cd infrastructure/terraform
terraform init
terraform apply
cd ../..
./scripts/deploy.sh
```

### Azure

Azure deploys:

- Storage Account static website
- Azure Table Storage cookbook table
- Linux Azure Function App cookbook API

```bash
node scripts/setup.mjs
cd infrastructure/azure/terraform
terraform init
terraform apply
cd ../../..
./scripts/deploy-azure.sh
```

The Azure deploy script uses Azure CLI for static upload and Azure Functions Core Tools for function publishing.

### Local Server

The local server path runs Apache, PHP, and MariaDB. MariaDB stores the cookbook as a JSON document in an open-source backend instead of saving recipes in the browser.

Fast Docker-based local run:

```bash
node scripts/setup.mjs
docker compose --env-file .env -f server/local/docker-compose.yml up -d
```

Open:

```text
http://localhost:8080
```

Native local install helpers:

```bash
./scripts/install-local-server.sh
```

Windows PowerShell:

```powershell
.\scripts\install-local-server.ps1
```

## Windows Setup

PowerShell:

```powershell
.\scripts\setup.ps1
```

Command Prompt:

```bat
scripts\setup.bat
```

## Mac And Linux Setup

```bash
./scripts/setup.sh
```

## Project Layout

```text
.
├── app.js
├── index.html
├── styles.css
├── site-config.example.js
├── site-config.js
├── scripts/
│   ├── deploy.sh
│   ├── deploy-azure.sh
│   ├── install-local-server.sh
│   ├── install-local-server.ps1
│   ├── setup.bat
│   ├── setup.mjs
│   └── setup.ps1
├── server/
│   ├── aws/
│   ├── azure/
│   └── local/
└── infrastructure/
    ├── azure/
    └── terraform/
        ├── main.tf
        ├── outputs.tf
        ├── terraform.tfvars.example
        └── variables.tf
```

## Data Storage

Recipes are stored in the configured backend:

- AWS: DynamoDB through Lambda and API Gateway
- Azure: Azure Table Storage through Azure Functions
- Local server: MariaDB through a PHP API

The browser keeps recipes in memory only while the page is open. It does not persist cookbook data to `localStorage`, IndexedDB, cookies, or another browser cache. Use **Export JSON** and **Import JSON** for manual backup movement between deployments.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. See [LICENSE](./LICENSE).
