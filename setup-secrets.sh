#!/bin/bash

# Setup secrets for MindsetOS AI Backend in Google Cloud
# Make sure to run: chmod +x setup-secrets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Setting up secrets for MindsetOS AI Backend${NC}"

# Check if gcloud is installed
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}❌ gcloud CLI is required but not installed. Please install it first.${NC}" >&2; exit 1; }

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ No Google Cloud project set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}📋 Using project: $PROJECT_ID${NC}"

# Enable Secret Manager API
echo -e "${YELLOW}🔧 Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name >/dev/null 2>&1; then
        echo -e "${YELLOW}🔄 Updating existing secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
    else
        echo -e "${YELLOW}🆕 Creating new secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=-
    fi
}

# Prompt for secrets
echo -e "${YELLOW}Please enter your environment variables:${NC}"

echo -n "OpenAI API Key: "
read -s OPENAI_API_KEY
echo

echo -n "Supabase URL: "
read SUPABASE_URL

echo -n "Supabase Service Role Key: "
read -s SUPABASE_SERVICE_ROLE_KEY
echo

# Validate inputs
if [ -z "$OPENAI_API_KEY" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ All environment variables are required${NC}"
    exit 1
fi

# Create secrets
create_or_update_secret "openai-api-key" "$OPENAI_API_KEY"
create_or_update_secret "supabase-url" "$SUPABASE_URL"
create_or_update_secret "supabase-service-role-key" "$SUPABASE_SERVICE_ROLE_KEY"

echo -e "${GREEN}✅ All secrets have been created/updated successfully!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Run ./deploy-to-cloudrun.sh to deploy your backend"
echo -e "   2. Update your frontend configuration to use the Cloud Run URL"
echo -e "   3. Deploy your frontend to Vercel" 