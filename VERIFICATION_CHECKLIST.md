# ConflictRadar - Deployment Verification Checklist

## ✅ Pre-Deployment Verification

### Backend Fixes Applied
- [x] OAuth callback redirect fixed to use `?token=${accessToken}` format
- [x] Dynamic FRONTEND_URL configuration with fallback
- [x] Dynamic BACKEND_URL for OAuth callback
- [x] CORS configured with dynamic origin
- [x] Real GitHub API integration (not simulated data)
- [x] Railway deployment configuration (nixpacks.toml, railway.json)

### Frontend Fixes Applied
- [x] Environment variable support (VITE_API_URL)
- [x] TypeScript moved to dependencies for Vercel build
- [x] Vercel deployment configuration (vercel.json)
- [x] OAuth token extraction from URL query parameter
- [x] Dynamic API URL configuration

## 🔧 Environment Variables Setup

### Backend (Railway)
Required environment variables:
```bash
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
FRONTEND_URL=https://your-vercel-app.vercel.app
BACKEND_URL=https://ibm-bob-production.up.railway.app
WATSONX_API_KEY=your_watsonx_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
PORT=4500
```

### Frontend (Vercel)
Required environment variables:
```bash
VITE_API_URL=https://ibm-bob-production.up.railway.app
```

## 🔐 GitHub OAuth App Configuration

### Update GitHub OAuth App Settings
1. Go to: https://github.com/settings/developers
2. Select your OAuth App
3. Update **Authorization callback URL** to:
   ```
   https://ibm-bob-production.up.railway.app/api/auth/github/callback
   ```
4. Save changes

## 🧪 Testing Checklist

### 1. Backend Health Check
```bash
curl https://ibm-bob-production.up.railway.app/api/health
```
Expected response:
```json
{"status":"ok","name":"BOB Conflict Radar"}
```

### 2. OAuth Flow Test
1. Open frontend URL in browser
2. Click "Connect GitHub" or "Authorize BOB on GitHub" button
3. Verify redirect to GitHub OAuth page
4. Authorize the application
5. Verify redirect back to frontend with token in URL
6. Verify token is stored in localStorage
7. Verify "GitHub Connected" badge appears

### 3. Repository List Test
1. After connecting GitHub, verify repositories load
2. Check that your repositories appear in the list
3. Verify search functionality works
4. Verify manual repository entry form works

### 4. Repository Scan Test
1. Select a repository with open pull requests
2. Click "Scan" button
3. Verify scan completes successfully
4. Check that conflicts are detected (if any exist)
5. Verify real data is displayed (not simulated)

### 5. Teams Page Test
1. Navigate to Teams page
2. Verify real contributors from scanned repository appear
3. Check that contribution counts are accurate
4. Verify team assignments are displayed

### 6. Conflict Radar Test
1. Navigate to Conflict Radar page
2. Verify detected conflicts are displayed
3. Check that AI analysis is available
4. Verify conflict details show real PR information

## 🐛 Common Issues & Solutions

### Issue: "Connect GitHub" button doesn't redirect
**Solution**: 
- Verify GITHUB_CLIENT_ID is set in Railway
- Check browser console for errors
- Ensure BACKEND_URL is correct

### Issue: OAuth callback fails
**Solution**:
- Verify GitHub OAuth callback URL matches Railway URL
- Check GITHUB_CLIENT_SECRET is correct
- Verify FRONTEND_URL is set correctly

### Issue: "Failed to load repositories"
**Solution**:
- Check GitHub token is valid
- Verify CORS is configured correctly
- Check browser console for CORS errors

### Issue: Scan returns no conflicts
**Solution**:
- Verify repository has open pull requests
- Check that PRs modify overlapping files
- Review backend logs for errors

### Issue: Teams page shows no data
**Solution**:
- Ensure a repository has been scanned first
- Verify GitHub API token has correct permissions
- Check backend logs for API errors

## 📊 Data Flow Verification

### OAuth Flow
```
Frontend → Backend /api/auth/github
         → GitHub OAuth
         → Backend /api/auth/github/callback
         → Frontend ?token=xxx
         → localStorage.setItem('github_token', token)
```

### Repository Scan Flow
```
Frontend → Backend /api/github/scan
         → GitHub API (fetch repo, PRs, files, contributors)
         → Conflict detection algorithm
         → watsonx.ai analysis (optional)
         → Return scan results
         → Frontend displays conflicts
```

### Teams Data Flow
```
Frontend → Backend /api/github/teams
         → Retrieve last scan data
         → Return contributors with stats
         → Frontend displays team members
```

## 🚀 Deployment Steps

### 1. Deploy Backend to Railway
```bash
# Railway will automatically detect and deploy
# Verify deployment at: https://ibm-bob-production.up.railway.app/api/health
```

### 2. Deploy Frontend to Vercel
```bash
# From frontend directory
vercel --prod

# Or connect GitHub repo to Vercel for automatic deployments
```

### 3. Update Environment Variables
- Set all required variables in Railway dashboard
- Set VITE_API_URL in Vercel dashboard
- Update GitHub OAuth callback URL

### 4. Test Complete Flow
- Follow testing checklist above
- Verify all features work end-to-end

## 📝 Post-Deployment Notes

### Performance Monitoring
- Monitor Railway logs for errors
- Check Vercel analytics for frontend issues
- Monitor GitHub API rate limits

### Security Considerations
- Never commit .env files
- Rotate GitHub OAuth secrets regularly
- Monitor for exposed credentials

### Backup Strategy
- Export scan results regularly
- Keep local copies of configuration
- Document any custom changes

## ✨ Success Criteria

- [ ] Backend health check returns 200 OK
- [ ] OAuth flow completes successfully
- [ ] Repositories load from GitHub API
- [ ] Repository scan detects real conflicts
- [ ] Teams page shows real contributors
- [ ] AI analysis works (if watsonx configured)
- [ ] All pages load without errors
- [ ] No console errors in browser
- [ ] No CORS errors
- [ ] Mobile responsive design works

## 🎯 Ready for Hackathon Submission

Once all items above are verified:
1. Export Bob IDE task session reports
2. Create presentation slides
3. Record demo video (optional)
4. Prepare GitHub repository
5. Submit project

---

**Last Updated**: 2026-05-17
**Status**: Ready for deployment testing