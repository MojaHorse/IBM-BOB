# BOB — Detailed Setup Guide

Complete setup instructions with credential walkthroughs, troubleshooting, and security notes.

---

## Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| GitHub account | Any | https://github.com |
| IBM Cloud account | Free trial | https://cloud.ibm.com |

---

## 1. Install Dependencies

```bash
# Clone the repo
git clone https://github.com/yourusername/IBM_BOB.git
cd IBM_BOB

# Backend dependencies (includes @ibm-cloud/watsonx-ai SDK)
cd backend
npm install

# Frontend dependencies (Vite + TypeScript)
cd ../frontend
npm install
```

---

## 2. GitHub OAuth App Setup

BOB uses GitHub OAuth to access your repositories. You need to create an OAuth App:

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in the form:

| Field | Value |
|---|---|
| Application name | `BOB Conflict Radar` |
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:4500/api/auth/github/callback` |

4. Click **"Register application"**
5. You'll see your **Client ID** — copy it
6. Click **"Generate a new client secret"** — copy it immediately (shown only once)

> ⚠️ The callback URL must be **exactly** `http://localhost:4500/api/auth/github/callback` — no trailing slash, no HTTPS.

---

## 3. IBM watsonx.ai Setup

### 3a. Get an API Key

1. Go to **https://cloud.ibm.com/iam/apikeys**
2. Click **"Create"**
3. Name it `BOB Hackathon Key`
4. Click **"Create"**
5. **Copy the API key immediately** — you cannot see it again

### 3b. Get a Project ID

1. Go to **https://dataplatform.cloud.ibm.com/wx/home**
2. Create a project (or use an existing one)
3. Open the project → click the **"Manage"** tab
4. Copy the **Project ID** (format: `12345678-1234-1234-1234-123456789abc`)

### 3c. Associate the Watson Machine Learning Service

1. In your watsonx.ai project, go to **Manage → Services & Integrations**
2. Click **"Associate Service"**
3. Select **Watson Machine Learning** → associate it
4. This is required for the Granite model to be available

---

## 4. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# GitHub OAuth (from Step 2)
GITHUB_CLIENT_ID=Ov23li...your_client_id
GITHUB_CLIENT_SECRET=bb462091...your_client_secret
FRONTEND_URL=http://localhost:5173

# IBM watsonx.ai (from Step 3)
WATSONX_API_KEY=ebwYuZ...your_api_key
WATSONX_PROJECT_ID=e38a0ca3-730e-...your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Server
PORT=4500
NODE_ENV=development
```

> **Note:** If you're in a different IBM Cloud region, change `WATSONX_URL` accordingly:
> - Dallas: `https://us-south.ml.cloud.ibm.com`
> - Frankfurt: `https://eu-de.ml.cloud.ibm.com`
> - Tokyo: `https://jp-tok.ml.cloud.ibm.com`

---

## 5. Test watsonx.ai Connection

```bash
cd backend
node test-watsonx.js
```

**Success output:**
```
✅ watsonx.ai client initialized
🤖 Testing text generation with Granite model...
✅ Text generation successful!
✨ watsonx.ai connection test PASSED!
```

**Error reference:**

| Error | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid API key | Regenerate at https://cloud.ibm.com/iam/apikeys |
| `404 Not Found` | Invalid Project ID | Check project in https://dataplatform.cloud.ibm.com/projects |
| `403 Forbidden` | No WML service associated | Associate Watson Machine Learning in project settings |
| Network timeout | Firewall or VPN | Try without VPN, check internet |

> **Fallback:** Even without watsonx.ai configured, BOB works using rule-based reasoning. The AI just provides richer analysis when available.

---

## 6. Start the Application

You need two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
```
You should see: `BOB backend running on http://localhost:4500`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
You should see: `VITE ready in ~300ms → http://localhost:5173`

---

## 7. First Run Walkthrough

1. **Open** http://localhost:5173 in your browser
2. **Connect GitHub** — click the badge in the header or go to Settings
3. **Authorize** the OAuth app on GitHub — you'll be redirected back
4. **Go to Repositories** — your GitHub repos will load
5. **Select a repo** by clicking on it (it turns blue with an "Active" badge)
6. **Click "🔍 Scan & Analyze"** — this triggers:
   - Conflict scenario generation
   - AI context building
   - watsonx.ai Granite analysis
   - Decision layer processing
   - Approval generation (if needed)
7. **Visit Conflict Radar** — see the full AI analysis
8. **Visit Simulations** — see what-if strategy predictions
9. **Visit Approvals** — approve or dismiss AI recommendations

---

## Troubleshooting

### "Cannot find module '@ibm-cloud/watsonx-ai'"
```bash
cd backend && npm install
```

### GitHub OAuth redirect goes nowhere
- Verify the callback URL is **exactly**: `http://localhost:4500/api/auth/github/callback`
- Make sure the backend is running on port 4500
- Check browser console for errors

### "401 Unauthorized" when scanning
- Your GitHub token may have expired
- Click disconnect in Settings → reconnect

### Scan shows "owner is not defined"
- This was a bug that has been fixed — make sure you have the latest `server.js`

### Pages still show data after disconnect
- All disconnect buttons now call `POST /api/disconnect` to clear backend state
- If you see stale data, restart the backend: `kill -9 $(lsof -t -i :4500) && node server.js`

### Port 4500 already in use
```bash
kill -9 $(lsof -t -i :4500)
```

---

## Security Notes

⚠️ **Never commit `.env` to Git.** The `.gitignore` is already configured to exclude it.

If you accidentally expose credentials:
1. **GitHub:** Revoke the OAuth app at https://github.com/settings/developers
2. **IBM Cloud:** Delete the API key at https://cloud.ibm.com/iam/apikeys
3. **Generate new credentials** and update `.env`

---

## Cost Management

**watsonx.ai Free Tier:**
- Each scan uses ~400-800 tokens for AI analysis
- Results are cached — rescanning the same repo reuses cached analysis
- The reanalyze button triggers a fresh AI call
- Monitor usage at https://cloud.ibm.com/billing

**Tips:**
- Use smaller repos for testing
- AI analysis is cached per conflict ID
- Rule-based fallback costs zero tokens

---

## What's Running Where

| Service | URL | Purpose |
|---|---|---|
| Frontend (Vite) | http://localhost:5173 | UI with hot reload |
| Backend (Express) | http://localhost:4500 | API server |
| GitHub API | https://api.github.com | Repository data |
| watsonx.ai | https://us-south.ml.cloud.ibm.com | AI reasoning |

---

**Setup complete! Ready to demo.** 🎉