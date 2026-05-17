# ConflictRadar - Deployment Guide

## 🚀 Deploy to Production (Railway + Vercel)

This guide will help you deploy ConflictRadar to production in under 2 hours.

**Stack:**
- **Backend**: Railway (Node.js)
- **Frontend**: Vercel (Vite)
- **Database**: JSON file storage (included)

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. ✅ **GitHub Account** - For OAuth and repository hosting
2. ✅ **Railway Account** - Sign up at https://railway.app
3. ✅ **Vercel Account** - Sign up at https://vercel.com
4. ✅ **IBM Cloud Account** - For watsonx.ai access
5. ✅ **GitHub OAuth App** - Create at https://github.com/settings/developers

---

## 🎯 Deployment Timeline

- ⏱️ **30 min**: Deploy backend to Railway
- ⏱️ **20 min**: Deploy frontend to Vercel
- ⏱️ **10 min**: Configure GitHub OAuth
- ⏱️ **Total**: ~1 hour

---

## 🔧 Part 1: Deploy Backend to Railway (30 minutes)

### Step 1: Prepare Your Repository

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Verify backend files exist**:
   - ✅ `backend/railway.json`
   - ✅ `backend/nixpacks.toml`
   - ✅ `backend/.env.example`
   - ✅ `backend/package.json`

### Step 2: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `IBM_BOB` repository
5. Railway will auto-detect Node.js

### Step 3: Configure Backend Service

1. **Set Root Directory**:
   - Click on your service
   - Go to **Settings** → **Root Directory**
   - Set to: `backend`
   - Click **Save**

2. **Add Environment Variables**:
   - Go to **Variables** tab
   - Add the following variables:

   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://your-app.railway.app
   WATSONX_API_KEY=your_watsonx_api_key
   WATSONX_PROJECT_ID=your_watsonx_project_id
   WATSONX_URL=https://us-south.ml.cloud.ibm.com
   PORT=4500
   NODE_ENV=production
   ```

   **Note**: You'll update `FRONTEND_URL` after deploying to Vercel.

### Step 4: Deploy Backend

1. Railway will automatically deploy
2. Wait for build to complete (2-3 minutes)
3. Copy your backend URL (e.g., `https://your-app.railway.app`)

### Step 5: Test Backend

```bash
curl https://your-app.railway.app/api/health
# Should return: {"status":"ok","name":"BOB Conflict Radar"}
```

---

## 🎨 Part 2: Deploy Frontend to Vercel (20 minutes)

### Step 1: Prepare Frontend

1. **Verify frontend files exist**:
   - ✅ `frontend/vercel.json`
   - ✅ `frontend/.env.example`
   - ✅ `frontend/package.json`

### Step 2: Create Vercel Project

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Vite

### Step 3: Configure Frontend

1. **Framework Preset**: Vite (auto-detected)
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build` (auto-detected)
4. **Output Directory**: `dist` (auto-detected)

5. **Add Environment Variable**:
   - Click **"Environment Variables"**
   - Add:
     ```
     VITE_API_URL=https://your-app.railway.app
     ```
   - Replace with your actual Railway URL

### Step 4: Deploy Frontend

1. Click **"Deploy"**
2. Wait for build (2-3 minutes)
3. Copy your frontend URL (e.g., `https://conflictradar.vercel.app`)

### Step 5: Update Backend Environment

1. Go back to Railway
2. Update `FRONTEND_URL` variable to your Vercel URL
3. Click **"Redeploy"** to apply changes

---

## 🔐 Part 3: Configure GitHub OAuth (10 minutes)

### Step 1: Update GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click on your OAuth App
3. Update the following:

   **Homepage URL**:
   ```
   https://conflictradar.vercel.app
   ```

   **Authorization callback URL**:
   ```
   https://your-app.railway.app/api/auth/github/callback
   ```

4. Click **"Update application"**

### Step 2: Verify OAuth Flow

1. Visit your Vercel URL
2. Click **"Connect GitHub"**
3. Authorize the app
4. You should be redirected back successfully

---

## ✅ Part 4: Verify Deployment

### Test Checklist

- [ ] **Backend Health**: `curl https://your-app.railway.app/api/health`
- [ ] **Frontend Loads**: Visit your Vercel URL
- [ ] **GitHub OAuth**: Can connect GitHub account
- [ ] **Repository List**: Can see your repositories
- [ ] **Scan Works**: Can scan a repository
- [ ] **Conflict Detection**: Real conflicts are detected
- [ ] **AI Analysis**: watsonx.ai analysis works
- [ ] **Teams Page**: Shows real contributors

---

## 🔧 Configuration Files Reference

### Backend Files

**`backend/railway.json`**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**`backend/nixpacks.toml`**:
```toml
[phases.setup]
nixPkgs = ["nodejs_18"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["echo 'No build step required'"]

[start]
cmd = "node server.js"
```

### Frontend Files

**`frontend/vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Issue: Backend Won't Start

**Solution**:
1. Check Railway logs: Click on service → **Deployments** → **View Logs**
2. Verify all environment variables are set
3. Ensure `PORT` is set to `4500`

### Issue: CORS Errors

**Solution**:
1. Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. No trailing slash in URLs
3. Redeploy backend after changing environment variables

### Issue: GitHub OAuth Fails

**Solution**:
1. Verify callback URL in GitHub OAuth settings matches Railway URL
2. Format: `https://your-app.railway.app/api/auth/github/callback`
3. Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct

### Issue: watsonx.ai Connection Fails

**Solution**:
1. Verify `WATSONX_API_KEY` is correct
2. Verify `WATSONX_PROJECT_ID` is correct
3. Check Railway logs for specific error messages

### Issue: Frontend Can't Connect to Backend

**Solution**:
1. Verify `VITE_API_URL` in Vercel matches Railway URL
2. Redeploy frontend after changing environment variables
3. Check browser console for CORS errors

---

## 📊 Monitoring & Logs

### Railway Logs

1. Go to your Railway project
2. Click on your service
3. Go to **Deployments** tab
4. Click on latest deployment
5. View real-time logs

### Vercel Logs

1. Go to your Vercel project
2. Click on **Deployments** tab
3. Click on latest deployment
4. View build and runtime logs

---

## 💰 Cost Estimates

### Railway (Backend)

- **Free Tier**: $5 credit/month
- **Estimated Usage**: ~$3-5/month for hackathon
- **Includes**: 500 hours, 512MB RAM, 1GB storage

### Vercel (Frontend)

- **Free Tier**: Unlimited for personal projects
- **Includes**: 100GB bandwidth, automatic HTTPS
- **Cost**: $0/month

### Total Monthly Cost: ~$0-5

---

## 🔄 Redeployment

### Update Backend

1. Push changes to GitHub
2. Railway auto-deploys from `main` branch
3. Or manually redeploy from Railway dashboard

### Update Frontend

1. Push changes to GitHub
2. Vercel auto-deploys from `main` branch
3. Or manually redeploy from Vercel dashboard

---

## 🎯 Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Go to your Vercel project
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Update DNS records as instructed
5. Update `FRONTEND_URL` in Railway

### Add Custom Domain to Railway

1. Go to your Railway service
2. Click **Settings** → **Domains**
3. Add custom domain
4. Update DNS records
5. Update GitHub OAuth callback URL

---

## 📝 Environment Variables Checklist

### Backend (Railway)

- [ ] `GITHUB_CLIENT_ID`
- [ ] `GITHUB_CLIENT_SECRET`
- [ ] `FRONTEND_URL`
- [ ] `BACKEND_URL`
- [ ] `WATSONX_API_KEY`
- [ ] `WATSONX_PROJECT_ID`
- [ ] `WATSONX_URL`
- [ ] `PORT`
- [ ] `NODE_ENV`

### Frontend (Vercel)

- [ ] `VITE_API_URL`

### GitHub OAuth App

- [ ] Homepage URL updated
- [ ] Callback URL updated

---

## 🚀 Quick Deploy Commands

### Deploy Backend to Railway

```bash
# Railway CLI (optional)
npm install -g @railway/cli
railway login
railway link
railway up
```

### Deploy Frontend to Vercel

```bash
# Vercel CLI (optional)
npm install -g vercel
vercel login
vercel --prod
```

---

## 📚 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **GitHub OAuth**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **watsonx.ai**: https://www.ibm.com/products/watsonx-ai

---

## ✅ Deployment Complete!

Your ConflictRadar app is now live and production-ready! 🎉

**Next Steps:**
1. Test all features thoroughly
2. Monitor logs for any issues
3. Share your deployment URL
4. Prepare your hackathon demo

---

**Built with ❤️ using IBM watsonx.ai + IBM Bob AI**