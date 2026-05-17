# ConflictRadar - Dynamic Data Implementation Guide

## 🎯 Overview

ConflictRadar now pulls **real data from GitHub** instead of using mock data. This makes the application fully functional and production-ready.

---

## ✅ What Was Implemented

### 1. Enhanced GitHub Client (`backend/services/integrations/githubClient.js`)

Added new methods to fetch real GitHub data:

- **`getRepoContributors(owner, repo, token)`** - Fetches all contributors with their contribution counts
- **`getRepoPullRequests(owner, repo, token, state)`** - Fetches all PRs (open, closed, or all)
- **`getPRFiles(owner, repo, pullNumber, token)`** - Fetches files changed in a specific PR
- **`getRepository(owner, repo, token)`** - Fetches detailed repository information

### 2. Real Conflict Detection (`backend/server.js`)

The `/api/github/scan` endpoint now:

1. ✅ Fetches repository details from GitHub
2. ✅ Gets all open PRs
3. ✅ Fetches files changed in each PR
4. ✅ Compares files across PRs to detect conflicts
5. ✅ Fetches contributors for team data
6. ✅ Runs AI analysis on detected conflicts
7. ✅ Stores real scan results

**Conflict Detection Logic:**
- Compares files modified in each PR
- If 2+ PRs modify the same file → conflict detected
- Severity based on number of overlapping files:
  - **High**: 4+ files
  - **Medium**: 2-3 files
  - **Low**: 1 file

### 3. Dynamic Teams Endpoint (`backend/server.js`)

The `/api/teams` endpoint now:

1. ✅ Uses real contributor data from last scan
2. ✅ Assigns roles based on contribution count:
   - **Lead Developer**: 100+ contributions
   - **Senior Developer**: 50-99 contributions
   - **Developer**: 20-49 contributions
   - **Contributor**: < 20 contributions
3. ✅ Sorts members by contribution count
4. ✅ Falls back to mock data if no scan performed

### 4. Frontend Updates

**Teams Page (`frontend/src/pages/teams.ts`):**
- ✅ Displays real GitHub avatars
- ✅ Shows contribution counts
- ✅ Handles both URL avatars and initials

---

## 🚀 How It Works

### Step-by-Step Flow

1. **User Connects GitHub**
   - OAuth flow provides access token
   - Token stored in localStorage

2. **User Selects Repository**
   - Repository list fetched from GitHub
   - User clicks on a repo to make it active

3. **User Clicks "Scan & Analyze"**
   - Backend receives: `{ repo: "owner/reponame" }`
   - Backend calls GitHub API:
     ```
     GET /repos/{owner}/{repo}           → Repo details
     GET /repos/{owner}/{repo}/pulls     → All open PRs
     GET /repos/{owner}/{repo}/pulls/{n}/files → Files per PR
     GET /repos/{owner}/{repo}/contributors → Contributors
     ```

4. **Conflict Detection**
   - Compare files across all PRs
   - Find overlapping files
   - Calculate severity
   - Create conflict objects

5. **AI Analysis**
   - Each conflict sent to watsonx.ai
   - AI provides reasoning and recommendations
   - Decision layer adds urgency and priority

6. **Display Results**
   - Conflict Radar shows real conflicts
   - Teams page shows real contributors
   - All data is from actual GitHub repos

---

## 📊 Data Structure

### Scan Result
```javascript
{
  repo: "reponame",
  owner: "username",
  language: "JavaScript",
  openPullRequestCount: 5,
  activeBranchCount: 6,
  conflicts: [
    {
      id: "conflict-12-14",
      type: "cross_pr_conflict",
      severity: "high",
      pr1: {
        number: 12,
        title: "Add payment feature",
        author: "john",
        url: "https://github.com/...",
        branch: "feature/payment"
      },
      pr2: {
        number: 14,
        title: "Update payment logic",
        author: "jane",
        url: "https://github.com/...",
        branch: "fix/payment-bug"
      },
      overlappingFiles: ["src/payment.js", "src/checkout.js"],
      description: "PRs #12 and #14 modify 2 common file(s)",
      detectedAt: "2026-05-17T12:00:00.000Z"
    }
  ],
  pullRequests: [...],
  contributors: [
    {
      username: "john",
      avatar: "https://avatars.githubusercontent.com/u/123",
      contributions: 150,
      url: "https://github.com/john",
      type: "User"
    }
  ],
  scannedAt: "2026-05-17T12:00:00.000Z"
}
```

### Team Data
```javascript
{
  id: "my-repo",
  name: "my-repo",
  lead: "john",
  members: [
    {
      name: "john",
      avatar: "https://avatars.githubusercontent.com/u/123",
      role: "Lead Developer",
      contributions: 150,
      url: "https://github.com/john"
    }
  ],
  repos: ["my-repo"],
  alertChannel: "#my-repo-alerts",
  language: "JavaScript",
  scannedAt: "2026-05-17T12:00:00.000Z"
}
```

---

## 🧪 Testing

### Test Real Data Flow

1. **Start Backend**
   ```bash
   cd backend && node server.js
   ```

2. **Start Frontend**
   ```bash
   cd frontend && npm run dev
   ```

3. **Connect GitHub**
   - Click "Connect GitHub" in header
   - Authorize the app
   - You'll be redirected back

4. **Select a Repository**
   - Go to Repositories page
   - Click on any repo to make it active
   - Click "Scan & Analyze"

5. **View Results**
   - **Conflict Radar**: Shows real conflicts between PRs
   - **Teams**: Shows real contributors with avatars
   - **Simulations**: AI predictions for conflicts

### Test with Your Own Repo

**Requirements:**
- Repository must have 2+ open PRs
- PRs should modify some common files
- Repository should have contributors

**Best Test Repos:**
- Active projects with multiple developers
- Repos with ongoing feature development
- Projects with overlapping work

---

## 🔧 Configuration

### Environment Variables

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
FRONTEND_URL=http://localhost:5173

# IBM watsonx.ai
WATSONX_API_KEY=your_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

PORT=4500
```

### GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. **Callback URL**: `http://localhost:4500/api/auth/github/callback`
4. Copy Client ID and Secret to `.env`

---

## 📈 What's Dynamic Now

| Feature | Before | After |
|---------|--------|-------|
| **Repository List** | ✅ Real (already was) | ✅ Real |
| **Pull Requests** | ❌ Mock data | ✅ Real from GitHub |
| **Conflicts** | ❌ Generated scenarios | ✅ Real file overlaps |
| **Contributors** | ❌ Mock names | ✅ Real GitHub users |
| **Team Members** | ❌ Hardcoded | ✅ From contributors |
| **Avatars** | ❌ Initials only | ✅ Real GitHub avatars |
| **Contribution Counts** | ❌ N/A | ✅ Real commit counts |

---

## 🎯 Benefits

1. **Authentic Demo** - Shows real conflicts from actual repos
2. **Production Ready** - Works with any GitHub repository
3. **Accurate Analysis** - AI analyzes real code conflicts
4. **Real Teams** - Displays actual project contributors
5. **Scalable** - Handles repos of any size

---

## ⚠️ Limitations & Future Enhancements

### Current Limitations

1. **No Webhooks** - Uses polling, not real-time updates
2. **Single Repo** - Scans one repo at a time
3. **Open PRs Only** - Doesn't analyze closed/merged PRs
4. **File-Level Only** - Doesn't analyze line-level conflicts

### Future Enhancements

1. **GitHub Webhooks** - Real-time conflict detection
2. **Multi-Repo Analysis** - Cross-repository dependencies
3. **Historical Analysis** - Learn from past conflicts
4. **Line-Level Diff** - Detect actual merge conflicts
5. **Auto-Resolution** - Suggest and apply fixes

---

## 🚀 Deployment Notes

When deploying to production:

1. **Update Callback URL** in GitHub OAuth settings
2. **Update FRONTEND_URL** in backend `.env`
3. **Use HTTPS** for all endpoints
4. **Rate Limiting** - GitHub API has rate limits (5000/hour authenticated)
5. **Caching** - Cache contributor data to reduce API calls

---

## 📝 Summary

ConflictRadar is now **fully dynamic** and pulls real data from GitHub:

✅ Real repository information
✅ Real pull requests
✅ Real file conflicts
✅ Real contributors
✅ Real GitHub avatars
✅ Real contribution counts

The app is **production-ready** and can be used with any GitHub repository!

---

**Built with ❤️ using IBM watsonx.ai + IBM Bob AI**