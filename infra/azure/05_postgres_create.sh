#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
DB_SERVER="ai102postgres${RANDOM}"
DB_NAME="ai102"
DB_USER="postgres"
DB_PASS="${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}"

echo "====== Creating Azure Database for PostgreSQL ======"

az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --location "$REGION" \
  --admin-user "$DB_USER" \
  --admin-password "$DB_PASS" \
  --database-name "$DB_NAME" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --high-availability Disabled \
  --public-access Enabled

echo "✓ PostgreSQL server created: $DB_SERVER"

# Get connection details
FQDN=$(az postgres flexible-server show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --query fullyQualifiedDomainName -o tsv)

DB_URL="postgresql://${DB_USER}:${DB_PASS}@${FQDN}:5432/${DB_NAME}?schema=public&sslmode=require"

# Store outputs
echo "$DB_SERVER" > outputs/postgres_server.txt
echo "$DB_URL" > outputs/database_url.txt

echo ""
echo "Update Key Vault with database URL:"
echo "  az keyvault secret set --vault-name <KV_NAME> --name DATABASE-URL --value '$DB_URL'"

echo ""
echo "Connection details for migration:"
echo "  Server: $DB_SERVER"
echo "  FQDN: $FQDN"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
