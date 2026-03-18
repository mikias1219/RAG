#!/bin/bash
set -e

echo "====== AI102 RAG SaaS — Prerequisites ======"
echo "Checking for required tools..."

command -v az >/dev/null 2>&1 || { echo "Azure CLI not found. Install from https://learn.microsoft.com/cli/azure/install-azure-cli"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker not found. Install from https://docker.com"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq not found. Install from https://stedolan.github.io/jq"; exit 1; }

echo "✓ Azure CLI: $(az version --query '"azure-cli"' -o tsv)"
echo "✓ Docker: $(docker version --format '{{.Server.Version}}')"
echo "✓ jq: $(jq --version)"

echo ""
echo "Checking Azure login..."
az account show >/dev/null 2>&1 || { echo "Not logged into Azure. Run: az login"; exit 1; }

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "✓ Logged in to subscription: $SUBSCRIPTION_ID"

echo ""
echo "✓ All prerequisites satisfied. Ready to deploy."
