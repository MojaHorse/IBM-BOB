# BOB — AI-Powered GitHub Conflict Resolution System

**IBM BOB Hackathon 2026**

BOB is an intelligent conflict detection and resolution platform powered by **IBM watsonx.ai**. It connects to your GitHub repositories, detects cross-PR coordination risks, and uses the Granite 3-8B language model to provide structured engineering advice — complete with resolution strategies, risk predictions, and human-in-the-loop approvals.

---

## 🎯 What BOB Does

| Capability | Description |
|---|---|
| **Detect** | Scans GitHub repos for overlapping PRs and file-level conflicts |
| **Analyze** | Uses IBM watsonx.ai Granite model to explain *why* conflicts exist |
| **Predict** | Simulates resolution strategies with success probabilities and timelines |
| **Decide** | Generates prioritized recommendations with urgency scoring |
| **Act** | Human-in-the-loop approval workflow before taking any action |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Frontend (Vite + TypeScript)                   │
│  Overview · Repositories · Conflict Radar · Simulations         │
│  Teams · DocSync · Messages · Approvals · Resolution Log        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API (:5173 → :4500)
┌───────────────────────────┴─────────────────────────────────────┐
│                   Backend (Node.js + Express)                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ GitHub OAuth  │  │ Conflict     │  │ AI Intelligence      │  │
│  │ + API Client  │  │ Engine       │  │ · Context Builder    │  │
│  │              │  │ (Scenarios)  │  │ · AI Reasoning       │  │
│  └──────────────┘  └──────────────┘  │ · Decision Layer     │  │
│                                       │ · Signal Extractor   │  │
│  ┌──────────────┐  ┌──────────────┐  │ · Relationship Graph │  │
│  │ Simulation   │  │ Persistence  │  └──────────────────────┘  │
│  │ Engine       │  │ (JSON State) │                             │
│  └──────────────┘  └──────────────┘                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │  GitHub    │   │ watsonx.ai │   │  Conflict  │
   │  REST API  │   │  Granite   │   │  Scenarios │
   │            │   │  3-8B      │   │  (JSON)    │
   └────────────┘   └────────────┘   └────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **GitHub account** (any personal account works)
- **IBM Cloud account** with watsonx.ai access ([free trial](https://cloud.ibm.com))

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/IBM_BOB.git
cd IBM_BOB

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Credentials

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# GitHub OAuth — create at https://github.com/settings/developers
# Callback URL must be: http://localhost:4500/api/auth/github/callback
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
FRONTEND_URL=http://localhost:5173

# IBM watsonx.ai — API key from https://cloud.ibm.com/iam/apikeys
# Project ID from https://dataplatform.cloud.ibm.com/projects
WATSONX_API_KEY=your_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

PORT=4500
```

### 3. Start

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 4. Open & Connect

1. Open **http://localhost:5173**
2. Click **"Connect GitHub"** in the header
3. Authorize on GitHub → you'll be redirected back
4. Go to **Repositories** → select a repo → click **"Scan & Analyze"**
5. Visit **Conflict Radar** to see AI-powered analysis

---

## 📱 Pages & Features

| Page | Description |
|---|---|
| **Overview** | Dashboard with repo health, risk scores, and quick stats |
| **Teams** | Team structure with member roles and communication patterns |
| **Repositories** | GitHub repo list with risk scores — select & scan from here |
| **Conflict Radar** | AI-powered conflict analysis with WatsonX insights, decision layer, and reanalyze |
| **Simulations** | What-if predictions for resolution strategies with success probabilities |
| **Messages & Flags** | Alert inbox with risk notifications across channels |
| **DocSync** | Documentation drift detection (outdated docs vs actual code) |
| **Approvals** | Human-in-the-loop approval workflow — approve, dismiss, or create PRs |
| **Resolution Log** | Audit trail of all BOB actions and decisions |
| **Settings** | Integration management, RBAC configuration |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/auth/github` | Initiate GitHub OAuth |
| `GET` | `/api/auth/github/callback` | OAuth callback |
| `POST` | `/api/disconnect` | Clear session state (scan data, caches, approvals) |

### Repositories & Scanning
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/github/user/repos` | Fetch authenticated user's repos |
| `GET` | `/api/repos-overview` | Enriched repo list with risk scores |
| `POST` | `/api/github/scan` | Scan a repo for conflicts (triggers AI analysis) |
| `GET` | `/api/github/last-scan` | Get last scan results |

### AI Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/conflicts/:id/ai-analysis` | Get AI analysis for a specific conflict |
| `GET` | `/api/ai-analyses` | Get all cached AI analyses |
| `GET` | `/api/ai-stats` | Token usage statistics |
| `POST` | `/api/conflicts/:id/reanalyze` | Re-run AI analysis on a conflict |

### Simulations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/conflicts/:id/simulate` | Simulate a specific strategy |
| `POST` | `/api/conflicts/:id/compare-strategies` | Compare all resolution strategies |
| `GET` | `/api/simulations` | Get simulations for all scanned conflicts |

### Approvals & Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/approvals` | List all approvals |
| `POST` | `/api/approvals/:id/approve` | Approve an action |
| `POST` | `/api/approvals/:id/dismiss` | Dismiss an action |
| `POST` | `/api/approvals/:id/create-pr` | Create a PR for the action |

### Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resolution-log` | Audit trail of all actions |
| `GET` | `/api/teams` | Team structure and members |
| `GET` | `/api/alerts` | Active alerts and notifications |
| `GET` | `/api/docsync` | Documentation drift warnings |

---

## 📁 Project Structure

```
IBM_BOB/
├── backend/
│   ├── server.js                              # Express server + all API routes
│   ├── .env.example                           # Environment template
│   ├── test-watsonx.js                        # watsonx.ai connection test
│   ├── middleware/
│   │   └── auth.js                            # GitHub token validation
│   ├── services/
│   │   ├── integrations/
│   │   │   ├── githubClient.js                # GitHub API client (repos, token validation)
│   │   │   ├── githubService.js               # Extended GitHub service
│   │   │   └── hybridData.js                  # Hybrid real + demo data strategy
│   │   ├── intelligence/
│   │   │   ├── aiReasoning.js                 # watsonx.ai Granite integration
│   │   │   ├── contextBuilder.js              # 5-layer AI context enrichment
│   │   │   ├── decisionLayer.js               # Priority scoring & urgency classification
│   │   │   ├── signalExtractor.js             # Risk signal extraction
│   │   │   ├── relationshipGraph.js           # Developer relationship analysis
│   │   │   ├── conflictRadar.js               # Conflict detection logic
│   │   │   ├── docSync.js                     # Documentation drift detection
│   │   │   └── repoHealth.js                  # Repository health metrics
│   │   ├── simulation/
│   │   │   ├── conflictEngine.js              # Scenario-based conflict generation
│   │   │   └── simulationEngine.js            # What-if prediction engine
│   │   └── persistence/
│   │       └── stateStore.js                  # JSON file persistence (approvals, logs)
│   └── data/
│       └── conflictScenarios.json             # Conflict scenario templates
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── main.ts                            # App shell, routing, sidebar
│   │   ├── style.css                          # Root stylesheet imports
│   │   ├── css/
│   │   │   ├── base.css                       # Design tokens, dark theme
│   │   │   ├── components.css                 # Cards, pills, badges, buttons
│   │   │   ├── layout.css                     # Grid, sidebar, responsive
│   │   │   └── pages.css                      # Page-specific styles
│   │   └── pages/
│   │       ├── overview.ts                    # Dashboard
│   │       ├── teams.ts                       # Team management
│   │       ├── repositories.ts                # Repo list + scan trigger
│   │       ├── connect.ts                     # GitHub OAuth connect flow
│   │       ├── conflictRadar.ts               # AI conflict analysis (merged radar)
│   │       ├── simulations.ts                 # What-if predictions
│   │       ├── docSync.ts                     # Documentation drift
│   │       ├── approvals.ts                   # Approval workflow
│   │       ├── messagesFlags.ts               # Alerts inbox
│   │       ├── resolutionLog.ts               # Audit trail
│   │       ├── repoActivity.ts                # Repo activity feed
│   │       ├── alerts.ts                      # Alert notifications
│   │       └── settings.ts                    # Integration settings + RBAC
│   └── package.json
├── data/                                      # Persisted state (gitignored)
│   ├── approvals.json
│   └── resolutionLog.json
├── README.md                                  # This file
├── QUICKSTART.md                              # Step-by-step setup guide
└── SETUP.md                                   # Detailed setup + troubleshooting
```

---

## 🧠 AI Intelligence Pipeline

BOB's AI pipeline follows an **Enrich → Reason → Decide** flow:

```
1. ENRICH (Context Builder)
   ├── Diff summary (actual file changes)
   ├── Dependency signals (APIs, databases, core modules)
   ├── Historical patterns (conflict frequency, resolution times)
   ├── Repository context (language, size, branches)
   └── Relationship graph (developer dynamics, team friction)

2. REASON (AI Reasoning via watsonx.ai Granite 3-8B)
   ├── Root cause analysis
   ├── Risk assessment with confidence score
   ├── Resolution options (with pros/cons)
   └── Recommended owner

3. DECIDE (Decision Layer)
   ├── Urgency classification (critical/high/medium/low)
   ├── Priority scoring (0-100)
   ├── Approval requirements
   ├── Execution plan (step-by-step)
   └── SLA timeline
```

If watsonx.ai is unavailable or unconfigured, the system gracefully falls back to rule-based reasoning — the app never crashes.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite, TypeScript, Vanilla CSS (dark theme) |
| Backend | Node.js, Express |
| AI | IBM watsonx.ai, Granite 3-8B-Instruct |
| Auth | GitHub OAuth 2.0 |
| Persistence | JSON file store (approvals, resolution log) |
| HTTP | Axios |

---

## 🧪 Testing

### Test watsonx.ai
```bash
cd backend && node test-watsonx.js
```

### Test Backend
```bash
curl http://localhost:4500/api/health
# → {"status":"ok","name":"BOB Conflict Radar"}
```

### Test Full Flow
1. Connect GitHub → select a repo → scan
2. Check Conflict Radar for AI insights
3. Check Simulations for predictions
4. Check Approvals for pending actions
5. Approve an action → verify it moves to "Completed"
6. Disconnect GitHub → verify all pages reset to empty state

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|---------|
| `Cannot find module '@ibm-cloud/watsonx-ai'` | Run `cd backend && npm install` |
| `401 Unauthorized` on scan | Token expired — disconnect and reconnect GitHub |
| `watsonx.ai not configured` warning | Check `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` in `.env` |
| GitHub OAuth redirect fails | Verify callback URL is exactly `http://localhost:4500/api/auth/github/callback` |
| Port 4500 already in use | `kill -9 $(lsof -t -i :4500)` then restart |
| Stale data after disconnect | Backend `POST /api/disconnect` clears all state — all 3 disconnect buttons in the UI call this |

---

## 📄 License

MIT License

---

**Built with ❤️ for the IBM BOB Hackathon 2026**

*Transforming GitHub conflict management with AI-powered intelligence*