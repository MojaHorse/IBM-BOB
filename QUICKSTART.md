# 🚀 Quick Start Guide — IBM BOB

Get BOB running locally in **10 minutes**.

---

## Step 1: Install Dependencies

```bash
cd IBM_BOB

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

---

## Step 2: Create a GitHub OAuth App

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `BOB Conflict Radar`
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:4500/api/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"** → copy it immediately

---

## Step 3: Get IBM watsonx.ai Credentials

1. **API Key:**
   - Go to https://cloud.ibm.com/iam/apikeys
   - Click **"Create"** → name it `BOB` → copy the key

2. **Project ID:**
   - Go to https://dataplatform.cloud.ibm.com/projects
   - Open your project → **Manage** tab → copy the **Project ID**

---

## Step 4: Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
GITHUB_CLIENT_ID=your_client_id_from_step_2
GITHUB_CLIENT_SECRET=your_secret_from_step_2
FRONTEND_URL=http://localhost:5173

WATSONX_API_KEY=your_api_key_from_step_3
WATSONX_PROJECT_ID=your_project_id_from_step_3
WATSONX_URL=https://us-south.ml.cloud.ibm.com

PORT=4500
```

---

## Step 5: Test watsonx.ai (Optional)

```bash
cd backend
node test-watsonx.js
```

Expected:
```
✅ watsonx.ai client initialized
🤖 Testing text generation with Granite model...
✅ Text generation successful!
✨ watsonx.ai connection test PASSED!
```

> **Note:** If watsonx.ai isn't configured, BOB still works — it falls back to intelligent rule-based reasoning. The AI just adds richer, model-generated analysis.

---

## Step 6: Start the App

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
# → BOB backend running on http://localhost:4500
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## Step 7: Use BOB

1. **Open** http://localhost:5173
2. **Click** "Connect GitHub" in the header bar
3. **Authorize** BOB on GitHub → you'll be redirected back
4. Go to **Repositories** → click a repo to select it → click **"🔍 Scan & Analyze"**
5. Watch the backend console — you'll see AI analysis in real-time
6. Go to **Conflict Radar** to see the full AI-powered analysis
7. Go to **Simulations** to see what-if predictions
8. Go to **Approvals** to approve or dismiss recommended actions

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot find module` | Run `npm install` in both `backend/` and `frontend/` |
| GitHub OAuth redirect fails | Callback URL must be exactly `http://localhost:4500/api/auth/github/callback` |
| `401 Unauthorized` | Disconnect and reconnect GitHub in the UI |
| watsonx.ai errors | Check `.env` — no extra spaces around keys |
| Port already in use | `kill -9 $(lsof -t -i :4500)` |
| Stale data after disconnect | All disconnect buttons now call the backend to clear state |

---

## Demo Checklist

Before your demo, verify:

- [ ] `node test-watsonx.js` passes
- [ ] GitHub OAuth connects successfully
- [ ] Can scan a repository from the Repositories page
- [ ] Conflict Radar shows AI analysis with confidence scores
- [ ] Simulations shows strategy predictions
- [ ] Approvals page lets you approve/dismiss actions
- [ ] Disconnecting GitHub clears all pages properly
- [ ] No errors in browser console or backend terminal

---

**You're ready! 🎉**