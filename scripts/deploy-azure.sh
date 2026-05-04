#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="${REPO_ROOT}/infrastructure/azure/terraform"

command -v az >/dev/null 2>&1 || {
  echo "Azure CLI is required." >&2
  exit 1
}

command -v terraform >/dev/null 2>&1 || {
  echo "terraform is required." >&2
  exit 1
}

command -v node >/dev/null 2>&1 || {
  echo "node is required." >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required." >&2
  exit 1
}

STORAGE_ACCOUNT="$(cd "${TERRAFORM_DIR}" && terraform output -raw storage_account_name)"
RESOURCE_GROUP="$(cd "${TERRAFORM_DIR}" && terraform output -raw resource_group_name)"
FUNCTION_APP="$(cd "${TERRAFORM_DIR}" && terraform output -raw function_app_name)"
API_BASE_URL="$(cd "${TERRAFORM_DIR}" && terraform output -raw api_base_url)"
COOKBOOK_TITLE="$(
  cd "${REPO_ROOT}" &&
    node -e 'global.window={}; require("./site-config.js"); console.log(window.OPEN_COOKBOOK_CONFIG?.cookbookTitle || "Open Cookbook")'
)"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cp "${REPO_ROOT}/index.html" "${TMP_DIR}/"
cp "${REPO_ROOT}/styles.css" "${TMP_DIR}/"
cp "${REPO_ROOT}/app.js" "${TMP_DIR}/"
python3 - <<PY >"${TMP_DIR}/site-config.js"
import json
print("window.OPEN_COOKBOOK_CONFIG = {")
print(f"  cookbookTitle: {json.dumps('${COOKBOOK_TITLE}')},")
print(f"  apiBaseUrl: {json.dumps('${API_BASE_URL}')}")
print("};")
PY

az storage blob upload-batch \
  --account-name "${STORAGE_ACCOUNT}" \
  --destination '$web' \
  --source "${TMP_DIR}" \
  --overwrite true

if command -v func >/dev/null 2>&1; then
  (cd "${REPO_ROOT}/server/azure/functions" && npm install && func azure functionapp publish "${FUNCTION_APP}" --javascript)
else
  echo "Azure Functions Core Tools was not found. Install it, then run:" >&2
  echo "  cd server/azure/functions && npm install && func azure functionapp publish ${FUNCTION_APP} --javascript" >&2
fi

echo "Uploaded Open Cookbook to Azure Storage account ${STORAGE_ACCOUNT} in ${RESOURCE_GROUP}."
