#!/bin/bash

# Deploy MindsetOS AI Backend to Google Cloud Run
# Make sure to run: chmod +x deploy-to-cloudrun.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying MindsetOS AI Backend to Google Cloud Run${NC}"

# Check if required tools are installed
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}❌ gcloud CLI is required but not installed. Please install it first.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed. Please install it first.${NC}" >&2; exit 1; }

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ No Google Cloud project set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}📋 Using project: $PROJECT_ID${NC}"

# Set variables
SERVICE_NAME="mindsetos-ai-backend"
REGION="us-central1"  # Change this to your preferred region
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build --platform linux/amd64 -t $IMAGE_NAME .

echo -e "${YELLOW}📤 Pushing image to Google Container Registry...${NC}"
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --set-secrets OPENAI_API_KEY=openai-api-key:latest \
    --set-secrets SUPABASE_URL=supabase-url:latest \
    --set-secrets SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo -e "   1. Set up environment variables (secrets) in Google Cloud Console"
echo -e "   2. Update your frontend to use this URL: $SERVICE_URL"
echo -e "   3. Update CORS settings in your backend if needed"

# Save the URL to a file for easy reference
echo $SERVICE_URL > cloud-run-url.txt
echo -e "${GREEN}📝 Service URL saved to cloud-run-url.txt${NC}" 