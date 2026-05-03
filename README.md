# Open Cookbook

Open Cookbook is a small, single-cookbook recipe website. It keeps the feature set intentionally basic:

- Create, edit, print, and delete recipes.
- Add ingredients, directions, and optional notes.
- Search recipes by name, ingredient, or direction text.
- Store data in the browser with `localStorage`.
- Export and import a JSON backup.
- Deploy as a static website to AWS S3 and CloudFront.

This split intentionally excludes multi-user access, recipe sharing controls, social interaction features, paid-feature hooks, analytics, and original product branding.

## Quick Start

Run the setup helper from the repository root:

```bash
node scripts/setup.mjs
```

The setup helper asks for:

- cookbook title
- browser storage key
- optional AWS region
- optional S3 bucket name
- optional custom domain and Route 53 hosted zone ID

Then run the site locally:

```bash
python3 -m http.server 3000
```

Open:

```text
http://localhost:3000
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

## Deploy To AWS

1. Install Terraform and the AWS CLI.
2. Configure AWS credentials.
3. Run setup so `infrastructure/terraform/terraform.tfvars` exists.
4. Deploy infrastructure:

```bash
cd infrastructure/terraform
terraform init
terraform apply
```

5. Upload the static app:

```bash
cd ../..
./scripts/deploy.sh
```

If you configured a custom domain, Terraform creates the Route 53 alias records and ACM certificate. If not, use the CloudFront domain from Terraform output.

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
│   ├── setup.bat
│   ├── setup.mjs
│   └── setup.ps1
└── infrastructure/
    └── terraform/
        ├── main.tf
        ├── outputs.tf
        ├── terraform.tfvars.example
        └── variables.tf
```

## Data Storage

Recipes are stored locally in the user's browser under the configured storage key. Use **Export JSON** before changing browsers or clearing browser storage. Use **Import JSON** to restore a saved backup.

This open version does not include a shared database. That keeps the project low cost and removes multi-user, monetization, and account-management features.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. See [LICENSE](./LICENSE).
