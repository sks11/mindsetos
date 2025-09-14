# Deployment Guide: Google Cloud Run + Vercel

This guide walks you through deploying your MindsetOS AI application with the backend on Google Cloud Run and frontend on Vercel.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Vercel Account** (free tier is sufficient)
3. **Google Cloud CLI** installed and configured
4. **Docker** installed locally
5. **Git repository** connected to Vercel

## Step 1: Setup Google Cloud

### 1.1 Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 1.2 Initialize and Login

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create mindsetos-ai-backend --name="MindsetOS AI Backend"

# Set the project
gcloud config set project mindsetos-ai-backend
```

### 1.3 Enable Billing

Go to [Google Cloud Console](https://console.cloud.google.com/) and enable billing for your project.

## Step 2: Deploy Backend to Google Cloud Run

### 2.1 Setup Environment Variables

```bash
# Make the setup script executable
chmod +x setup-secrets.sh

# Run the script to create secrets
./setup-secrets.sh
```

When prompted, enter:
- **OpenAI API Key**: Your OpenAI API key
- **Supabase URL**: Your Supabase project URL
- **Supabase Service Role Key**: Your Supabase service role key

### 2.2 Deploy to Cloud Run

```bash
# Make the deployment script executable
chmod +x deploy-to-cloudrun.sh

# Deploy the backend
./deploy-to-cloudrun.sh
```

This script will:
- Enable required Google Cloud APIs
- Build and push your Docker image
- Deploy to Cloud Run
- Output your service URL

### 2.3 Note Your Backend URL

After deployment, you'll get a URL like:
```
https://mindsetos-ai-backend-xxx-uc.a.run.app
```

Save this URL - you'll need it for the frontend configuration.

## Step 3: Deploy Frontend to Vercel

### 3.1 Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Select the root directory

### 3.2 Configure Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables and add:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Backend API Configuration
NEXT_PUBLIC_API_URL=https://your-cloud-run-service-url

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=https://your-vercel-app.vercel.app
```

### 3.3 Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your Vercel domain to authorized origins:
   - `https://your-vercel-app.vercel.app`
5. Add callback URL:
   - `https://your-vercel-app.vercel.app/api/auth/callback/google`

### 3.4 Deploy

Vercel will automatically deploy when you push to your main branch.

## Step 4: Update Backend CORS Settings

After getting your Vercel URL, update the backend CORS settings:

1. Edit `scripts/fastapi_backend.py`
2. Update the `allow_origins` list:

```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://*.vercel.app",
    "https://your-actual-vercel-app.vercel.app",  # Replace with your actual URL
],
```

3. Redeploy the backend:
```bash
./deploy-to-cloudrun.sh
```

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Test Google OAuth login
3. Try creating a journal entry
4. Verify the AI analysis works
5. Check that history is saved and loaded correctly

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your Vercel URL is added to the backend CORS settings
   - Check that both HTTP and HTTPS are configured correctly

2. **Authentication Issues**
   - Verify Google OAuth redirect URLs are correct
   - Check that NEXTAUTH_URL matches your Vercel domain

3. **API Connection Issues**
   - Confirm NEXT_PUBLIC_API_URL is set correctly in Vercel
   - Test the backend URL directly in a browser

4. **Environment Variables**
   - Ensure all secrets are properly set in Google Cloud
   - Verify Vercel environment variables are configured

### Logs and Debugging

**Backend Logs (Google Cloud Run):**
```bash
gcloud run services logs tail mindsetos-ai-backend --region=us-central1
```

**Frontend Logs (Vercel):**
- Check the Vercel dashboard → Functions tab for logs

## Cost Optimization

### Google Cloud Run
- Uses pay-per-request pricing
- Automatically scales to zero when not in use
- Estimated cost: $0-5/month for low traffic

### Vercel
- Free tier includes:
  - 100GB bandwidth
  - Unlimited personal projects
  - Custom domains

## Security Checklist

- [ ] All API keys stored as secrets (not environment variables)
- [ ] CORS properly configured
- [ ] OAuth redirect URLs restricted to your domains
- [ ] Environment files excluded from Git
- [ ] Production URLs use HTTPS

## Maintenance

### Updating the Backend
```bash
# Make changes to your code
# Then redeploy
./deploy-to-cloudrun.sh
```

### Updating the Frontend
- Push changes to your Git repository
- Vercel will automatically redeploy

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review logs from both Google Cloud Run and Vercel
3. Ensure all environment variables are correctly set
4. Verify API endpoints are accessible

---

**Congratulations!** Your MindsetOS AI application is now deployed and ready for users. 🎉 