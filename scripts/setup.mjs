import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const terraformDir = path.join(repoRoot, "infrastructure", "terraform");
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

async function askYesNo(question, defaultValue = "n") {
  const answer = (await ask(`${question} (${defaultValue === "y" ? "Y/n" : "y/N"})`, defaultValue)).toLowerCase();
  return answer.startsWith("y");
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

try {
  console.log("Open Cookbook setup");
  console.log("Press Enter to accept defaults.\n");

  const cookbookTitle = await ask("Cookbook title", "Open Cookbook");
  const storageKey = await ask("Browser storage key", `${slug(cookbookTitle)}:data:v1`);
  const configureAws = await askYesNo("Configure AWS static hosting files now", "y");

  let awsRegion = "us-east-1";
  let siteBucketName = "";
  let customDomainName = "";
  let route53ZoneId = "";

  if (configureAws) {
    awsRegion = await ask("AWS region", "us-east-1");
    siteBucketName = await ask("S3 site bucket name", `${slug(cookbookTitle)}-site`);
    customDomainName = await ask("Custom domain name, blank for CloudFront only", "");
    if (customDomainName) {
      route53ZoneId = await ask("Route 53 hosted zone ID for the domain", "");
    }
  }

  writeFile(
    path.join(repoRoot, "site-config.js"),
    `window.OPEN_COOKBOOK_CONFIG = {\n  cookbookTitle: ${JSON.stringify(cookbookTitle)},\n  storageKey: ${JSON.stringify(storageKey)}\n};\n`
  );

  if (configureAws) {
    writeFile(
      path.join(terraformDir, "terraform.tfvars"),
      [
        `aws_region = ${JSON.stringify(awsRegion)}`,
        `site_bucket_name = ${JSON.stringify(siteBucketName)}`,
        `custom_domain_name = ${JSON.stringify(customDomainName)}`,
        `route53_zone_id = ${JSON.stringify(route53ZoneId)}`,
        ""
      ].join("\n")
    );
  }

  console.log("\nSetup complete.");
  console.log("Local test: python3 -m http.server 3000");
  if (configureAws) {
    console.log("AWS deploy: cd infrastructure/terraform && terraform init && terraform apply");
    console.log("Static upload: ./scripts/deploy.sh");
  }
} finally {
  rl?.close();
}
