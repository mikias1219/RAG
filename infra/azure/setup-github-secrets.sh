#!/bin/bash

###############################################################################
# Setup GitHub Secrets for CI/CD Pipeline
###############################################################################

set -e

GITHUB_REPO="${1:-mikias1219/RAG}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up GitHub secrets for CI/CD..."
echo "Repository: $GITHUB_REPO"
echo ""

# Check if gh CLI is installed
command -v gh >/dev/null 2>&1 || { echo "GitHub CLI (gh) not found. Install from https://cli.github.com"; exit 1; }

# Authenticate with GitHub
gh auth login 2>/dev/null || true

# Read values from outputs
if [ -f "$SCRIPT_DIR/outputs/acr_login_server.txt" ]; then
  ACR_LOGIN_SERVER=$(cat "$SCRIPT_DIR/outputs/acr_login_server.txt")
  echo "Setting ACR_LOGIN_SERVER..."
  gh secret set ACR_LOGIN_SERVER --body "$ACR_LOGIN_SERVER" -R "$GITHUB_REPO" 2>/dev/null || \
    echo "⚠️  Could not set ACR_LOGIN_SERVER (may require repo access)"
fi

if [ -f "$SCRIPT_DIR/outputs/keyvault_name.txt" ]; then
  KV_NAME=$(cat "$SCRIPT_DIR/outputs/keyvault_name.txt")
  echo "Setting KEY_VAULT_NAME..."
  gh secret set KEY_VAULT_NAME --body "$KV_NAME" -R "$GITHUB_REPO" 2>/dev/null || \
    echo "⚠️  Could not set KEY_VAULT_NAME"
fi

# Create Azure service principal for CI/CD
echo ""
echo "Creating Azure Service Principal for CI/CD..."

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
APP_NAME="github-ci-cd-$(date +%s)"

SP_DETAILS=$(az ad sp create-for-rbac \
  --name "$APP_NAME" \
  --role "Contributor" \
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \
  --sdk-auth)

echo ""
echo "Setting AZURE_CREDENTIALS secret..."
echo "$SP_DETAILS" | gh secret set AZURE_CREDENTIALS -R "$GITHUB_REPO" 2>/dev/null || \
  echo "⚠️  Could not set AZURE_CREDENTIALS (paste manually)"

echo ""
echo "✓ GitHub secrets configured!"
echo ""
echo "Secrets set:"
gh secret list -R "$GITHUB_REPO" 2>/dev/null || echo "Cannot list secrets (check GitHub UI)"
