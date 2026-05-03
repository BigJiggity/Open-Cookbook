#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="${REPO_ROOT}/infrastructure/terraform"

command -v aws >/dev/null 2>&1 || {
  echo "aws CLI is required." >&2
  exit 1
}

command -v terraform >/dev/null 2>&1 || {
  echo "terraform is required." >&2
  exit 1
}

SITE_BUCKET="$(cd "${TERRAFORM_DIR}" && terraform output -raw site_bucket_name)"
DISTRIBUTION_ID="$(cd "${TERRAFORM_DIR}" && terraform output -raw cloudfront_distribution_id)"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cp "${REPO_ROOT}/index.html" "${TMP_DIR}/"
cp "${REPO_ROOT}/styles.css" "${TMP_DIR}/"
cp "${REPO_ROOT}/app.js" "${TMP_DIR}/"
cp "${REPO_ROOT}/site-config.js" "${TMP_DIR}/"

aws s3 sync "${TMP_DIR}/" "s3://${SITE_BUCKET}" --delete
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*" >/dev/null

echo "Uploaded Open Cookbook to s3://${SITE_BUCKET}"
echo "CloudFront invalidation created for ${DISTRIBUTION_ID}"
