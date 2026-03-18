#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
OPENAI_ACCOUNT="ai102openai${RANDOM}"
CHAT_DEPLOYMENT="gpt-4o-mini"
EMBEDDING_DEPLOYMENT="text-embedding-3-small"

echo "====== Creating Azure OpenAI Service ======"

# Note: Requires Azure OpenAI access (apply at https://aka.ms/oai/access)
az cognitiveservices account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$OPENAI_ACCOUNT" \
  --location "$REGION" \
  --kind OpenAI \
  --sku S0

echo "✓ OpenAI account created: $OPENAI_ACCOUNT"

# Get endpoint and key
ENDPOINT=$(az cognitiveservices account show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$OPENAI_ACCOUNT" \
  --query properties.endpoint -o tsv)

API_KEY=$(az cognitiveservices account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --name "$OPENAI_ACCOUNT" \
  --query key1 -o tsv)

# Store outputs
echo "$OPENAI_ACCOUNT" > outputs/openai_account.txt
echo "$ENDPOINT" > outputs/openai_endpoint.txt
echo "$API_KEY" > outputs/openai_api_key.txt

echo ""
echo "Deploy models via Azure Portal or CLI:"
echo "  - Model: $CHAT_DEPLOYMENT (GPT-4o mini for chat)"
echo "  - Model: $EMBEDDING_DEPLOYMENT (text-embedding-3-small for vectors)"

echo ""
echo "Update Key Vault:"
echo "  az keyvault secret set --vault-name <KV_NAME> --name AZURE-OPENAI-ENDPOINT --value '$ENDPOINT'"
echo "  az keyvault secret set --vault-name <KV_NAME> --name AZURE-OPENAI-API-KEY --value '$API_KEY'"
