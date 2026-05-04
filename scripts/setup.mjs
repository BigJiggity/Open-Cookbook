import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const awsTerraformDir = path.join(repoRoot, "infrastructure", "terraform");
const azureTerraformDir = path.join(repoRoot, "infrastructure", "azure", "terraform");
const pipedAnswers = stdin.isTTY ? null : fs.readFileSync(0, "utf8").split(/\r?\n/);
const rl = pipedAnswers ? null : readline.createInterface({ input: stdin, output: stdout });

async function ask(question, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  if (pipedAnswers) {
    const answer = (pipedAnswers.shift() || "").trim();
    console.log(`${question}${suffix}: ${answer}`);
    return answer || defaultValue;
  }
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`Wrote ${path.relative(repoRoot, filePath)}`);
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "open-cookbook";
}

function azureStorageName(value) {
  return slug(value).replace(/-/g, "").slice(0, 20).padEnd(3, "0");
}

try {
  console.log("Open Cookbook setup");
  console.log("Storage is backend-only. The browser does not save cookbook data to local cache.\n");

  const cookbookTitle = await ask("Cookbook title", "Open Cookbook");
  const target = (await ask("Deploy target: aws, azure, or local", "local")).toLowerCase();
  const normalizedTarget = ["aws", "azure", "local"].includes(target) ? target : "local";

  let apiBaseUrl = "/api/cookbook.php";

  if (normalizedTarget === "aws") {
    const awsRegion = await ask("AWS region", "us-east-1");
    const siteBucketName = await ask("S3 site bucket name", `${slug(cookbookTitle)}-site`);
    const tableName = await ask("DynamoDB table name", `${siteBucketName}-cookbook`);
    const customDomainName = await ask("Custom domain name, blank for CloudFront only", "");
    const route53ZoneId = customDomainName ? await ask("Route 53 hosted zone ID for the domain", "") : "";
    apiBaseUrl = "__AWS_TERRAFORM_OUTPUT__";

    writeFile(
      path.join(awsTerraformDir, "terraform.tfvars"),
      [
        `aws_region = ${JSON.stringify(awsRegion)}`,
        `site_bucket_name = ${JSON.stringify(siteBucketName)}`,
        `custom_domain_name = ${JSON.stringify(customDomainName)}`,
        `route53_zone_id = ${JSON.stringify(route53ZoneId)}`,
        `cookbook_table_name = ${JSON.stringify(tableName)}`,
        ""
      ].join("\n")
    );
  }

  if (normalizedTarget === "azure") {
    const location = await ask("Azure location", "eastus");
    const resourceGroupName = await ask("Azure resource group name", `${slug(cookbookTitle)}-rg`);
    const storageAccountName = await ask("Azure storage account name", azureStorageName(cookbookTitle));
    const functionAppName = await ask("Azure Function App name", `${slug(cookbookTitle)}-api`);
    const tableName = await ask("Azure Table Storage table name", "cookbook");
    apiBaseUrl = "__AZURE_TERRAFORM_OUTPUT__";

    writeFile(
      path.join(azureTerraformDir, "terraform.tfvars"),
      [
        `location = ${JSON.stringify(location)}`,
        `resource_group_name = ${JSON.stringify(resourceGroupName)}`,
        `storage_account_name = ${JSON.stringify(storageAccountName)}`,
        `function_app_name = ${JSON.stringify(functionAppName)}`,
        `cookbook_table_name = ${JSON.stringify(tableName)}`,
        ""
      ].join("\n")
    );
  }

  if (normalizedTarget === "local") {
    const port = await ask("Local web server port", "8080");
    apiBaseUrl = `http://localhost:${port}/api/cookbook.php`;
    writeFile(path.join(repoRoot, ".env"), `OPEN_COOKBOOK_PORT=${port}\n`);
  }

  writeFile(
    path.join(repoRoot, "site-config.js"),
    `window.OPEN_COOKBOOK_CONFIG = {\n  cookbookTitle: ${JSON.stringify(cookbookTitle)},\n  apiBaseUrl: ${JSON.stringify(apiBaseUrl)}\n};\n`
  );

  console.log("\nSetup complete.");
  if (normalizedTarget === "aws") {
    console.log("Deploy infrastructure: cd infrastructure/terraform && terraform init && terraform apply");
    console.log("Upload app: ./scripts/deploy.sh");
  } else if (normalizedTarget === "azure") {
    console.log("Deploy infrastructure: cd infrastructure/azure/terraform && terraform init && terraform apply");
    console.log("Upload app and functions: ./scripts/deploy-azure.sh");
  } else {
    console.log("Start local server with Docker: docker compose --env-file .env -f server/local/docker-compose.yml up -d");
    console.log("Native LAMP install scripts are also available: scripts/install-local-server.sh and scripts/install-local-server.ps1");
  }
} finally {
  rl?.close();
}
