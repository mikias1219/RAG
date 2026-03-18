#!/bin/bash
set -e

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGION="${1:-eastus}"

echo "====== AI102 RAG SaaS — Full Azure Deployment ======"
echo "Region: $REGION"
echo ""

# Create outputs directory
mkdir -p "$SCRIPTS_DIR/outputs"

# Run prerequisite checks
echo "[1/11] Checking prerequisites..."
bash "$SCRIPTS_DIR/00_prereqs.sh"

# Create resource group
echo ""
echo "[2/11] Creating resource group..."
bash "$SCRIPTS_DIR/01_group_create.sh" "$REGION"

# Create ACR
echo ""
echo "[3/11] Creating Container Registry..."
bash "$SCRIPTS_DIR/02_acr_create.sh"

# Create Key Vault
echo ""
echo "[4/11] Creating Key Vault..."
bash "$SCRIPTS_DIR/03_keyvault_create.sh"

# Create Storage
echo ""
echo "[5/11] Creating Blob Storage..."
bash "$SCRIPTS_DIR/04_storage_create.sh"

# Create PostgreSQL
echo ""
echo "[6/11] Creating PostgreSQL Database..."
bash "$SCRIPTS_DIR/05_postgres_create.sh"

# Create AI Search
echo ""
echo "[7/11] Creating AI Search..."
bash "$SCRIPTS_DIR/06_aisearch_create.sh"

# Create OpenAI
echo ""
echo "[8/11] Creating OpenAI Service..."
bash "$SCRIPTS_DIR/07_openai_create.sh"

# Setup Container Apps env
echo ""
echo "[9/11] Setting up Container Apps Environment..."
bash "$SCRIPTS_DIR/08_containerapps_env_create.sh"

# Deploy backend
echo ""
echo "[10/11] Deploying Backend..."
bash "$SCRIPTS_DIR/09_containerapps_deploy_backend.sh"

# Deploy frontend
echo ""
echo "[11/11] Deploying Frontend..."
bash "$SCRIPTS_DIR/10_containerapps_deploy_frontend.sh"

# Setup monitoring
echo ""
echo "[+] Setting up Monitoring..."
bash "$SCRIPTS_DIR/11_monitor_setup.sh"

echo ""
echo "====== Deployment Complete! ======"
echo ""
echo "Access your application:"
echo "  Frontend: https://$(cat $SCRIPTS_DIR/outputs/frontend_fqdn.txt)"
echo "  Backend:  https://$(cat $SCRIPTS_DIR/outputs/backend_fqdn.txt)/api/health"
echo ""
echo "Resource Group: AI102"
echo ""
echo "Next steps:"
echo "  1. Configure secrets in Key Vault (update scripts with values)"
echo "  2. Deploy database schema: npm run prisma:deploy"
echo "  3. Test: curl https://$(cat $SCRIPTS_DIR/outputs/backend_fqdn.txt)/api/health"
