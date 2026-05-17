const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

// Simplified services
const githubClient = require("./services/integrations/githubClient");
const { validateGitHubToken, optionalAuth } = require("./middleware/auth");

// AI services (keep these - they're the core)
const { buildConflictContext, getCachedContext } = require("./services/intelligence/contextBuilder");
const { reasonAboutConflict } = require("./services/intelligence/aiReasoning");
const simulationEngine = require("./services/simulation/simulationEngine");
const { makeDecision, generateDecisionSummary } = require("./services/intelligence/decisionLayer");
const stateStore = require("./services/persistence/stateStore");
const { extractSignals } = require("./services/intelligence/signalExtractor");

const app = express();
const PORT = process.env.PORT || 4500;

app.use(cors());
app.use(express.json());

// ── State Store ──────────────────────────────────────────────────

let lastScan = null;

// Approvals and resolution logs are now persisted to JSON using stateStore



// AI analysis cache
let aiAnalysisCache = new Map();

// ── API Routes ───────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", name: "BOB Conflict Radar" });
});

// ── GitHub OAuth ─────────────────────────────────────────────────

app.get("/api/auth/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: "http://localhost:4500/api/auth/github/callback",
    scope: "repo",
    state: "bob-demo"
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

app.get("/api/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing GitHub authorization code");
  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      { headers: { Accept: "application/json" } }
    );
    const accessToken = tokenResponse.data.access_token;
    res.redirect(`${process.env.FRONTEND_URL}?github_connected=true&token=${accessToken}`);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("GitHub OAuth failed");
  }
});

// ── Helper Functions ─────────────────────────────────────────────

function assignTeam(language) {
  const teamMap = {
    'JavaScript': 'Frontend Team',
    'TypeScript': 'Frontend Team',
    'Python': 'Backend Team',
    'Java': 'Backend Team',
    'Go': 'Backend Team',
    'Rust': 'Backend Team',
    'Ruby': 'Backend Team',
    'PHP': 'Backend Team',
    'C#': 'Backend Team',
    'Swift': 'Mobile Team',
    'Kotlin': 'Mobile Team'
  };
  return teamMap[language] || 'Platform Team';
}

function addLogEntry(entry) {
  stateStore.appendLogEntry(entry);
}

// ── Global Repo Enrichment Logic ─────────────────────────────────

const teams = ["Core Banking", "Security & Ops", "Frontend UX", "Platform Infra", "Mobile App"];
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return ((h ^ (h >>> 16)) & 0x7fffffff) / 0x7fffffff;
}

function enrichRepo(repo, index) {
  const r1 = seededRandom(repo.name);
  const r2 = seededRandom(repo.name + "x");
  const r3 = seededRandom(repo.name + "y");

  let riskScore = Math.floor(r1 * 100);
  let status = riskScore >= 50 ? "Critical" : riskScore >= 20 ? "Warning" : "Healthy";
  let openPRs = Math.floor(r2 * 6) + 1;
  let conflictRisks = riskScore >= 40 ? Math.floor(r3 * 3) + 1 : 0;
  let docSyncWarnings = riskScore >= 25 ? Math.floor(r2 * 3) : 0;

  if (lastScan && lastScan.repo === repo.name) {
     conflictRisks = lastScan.conflicts?.length || 0;
     openPRs = lastScan.openPullRequestCount || openPRs;
     
     let highestRisk = 0;
     (lastScan.conflicts || []).forEach(c => {
       const signals = extractSignals(repo, { age: 10 }, c.overlappingFiles);
       if (signals.riskScore > highestRisk) highestRisk = signals.riskScore;
     });
     
     if (highestRisk > 0) {
       riskScore = highestRisk;
       status = riskScore >= 50 ? "Critical" : riskScore >= 20 ? "Warning" : "Healthy";
     }
  }

  return {
    ...repo,
    team: teams[index % teams.length],
    status,
    openPRs,
    conflictRisks,
    docSyncWarnings,
    riskScore,
    defaultBranch: repo.default_branch || "main",
    outdatedBranches: Math.floor(r3 * 6),
    lastScanned: lastScan && lastScan.repo === repo.name ? "Just now" : "1 hour ago"
  };
}

// ── User Repos (Simplified) ──────────────────────────────────────

app.get("/api/github/user/repos", validateGitHubToken, async (req, res) => {
  try {
    const repos = await githubClient.getRepos(req.githubToken);
    const enrichedRepos = repos.map((repo, index) => enrichRepo(repo, index));
    res.json(enrichedRepos);
  } catch (error) {
    console.error("Error fetching user repos:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// ── Repos Overview (Simplified) ──────────────────────────────────

app.get("/api/repos-overview", optionalAuth, async (req, res) => {
  try {
    if (!req.githubToken) return res.json([]);
    const repos = await githubClient.getRepos(req.githubToken);

    // Use deterministic global helper
    const enrichedRepos = repos.map((repo, index) => enrichRepo(repo, index));
    res.json(enrichedRepos);
  } catch (error) {
    console.error('Error in repos-overview:', error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});


// ── Simplified Scan with AI Analysis ─────────────────────────────

app.post("/api/github/scan", validateGitHubToken, async (req, res) => {
  const { repo } = req.body;
  if (!repo) return res.status(400).json({ error: "Repository name required" });

  try {
    console.log(`\n🔍 Scanning repository: ${repo}`);
    
    // Parse owner and repo name
    const [owner, repoName] = repo.includes('/') ? repo.split('/') : [req.githubUser?.login, repo];
    
    if (!owner || !repoName) {
      return res.status(400).json({ error: "Invalid repository format. Use 'owner/repo'" });
    }
    
    // Get repository details
    const repoDetails = await githubClient.getRepository(owner, repoName, req.githubToken);
    if (!repoDetails) {
      return res.status(404).json({ error: "Repository not found" });
    }
    
    console.log(`📦 Repository: ${repoDetails.fullName} (${repoDetails.language})`);
    
    // Get all open PRs
    const openPRs = await githubClient.getRepoPullRequests(owner, repoName, req.githubToken, 'open');
    console.log(`📋 Found ${openPRs.length} open PR(s)`);
    
    // Get contributors for team data
    const contributors = await githubClient.getRepoContributors(owner, repoName, req.githubToken);
    console.log(`👥 Found ${contributors.length} contributor(s)`);
    
    // Get files for each PR and detect conflicts
    const prWithFiles = await Promise.all(
      openPRs.map(async pr => {
        const files = await githubClient.getPRFiles(owner, repoName, pr.number, req.githubToken);
        return {
          ...pr,
          files: files
        };
      })
    );
    
    // Detect conflicts between PRs
    const conflicts = [];
    for (let i = 0; i < prWithFiles.length; i++) {
      for (let j = i + 1; j < prWithFiles.length; j++) {
        const pr1 = prWithFiles[i];
        const pr2 = prWithFiles[j];
        
        const pr1Files = pr1.files.map(f => f.filename);
        const pr2Files = pr2.files.map(f => f.filename);
        
        const overlapping = pr1Files.filter(f => pr2Files.includes(f));
        
        if (overlapping.length > 0) {
          const conflictId = `conflict-${pr1.number}-${pr2.number}`;
          conflicts.push({
            id: conflictId,
            type: 'cross_pr_conflict',
            severity: overlapping.length > 3 ? 'high' : overlapping.length > 1 ? 'medium' : 'low',
            pr1: {
              number: pr1.number,
              title: pr1.title,
              author: pr1.author,
              url: pr1.url,
              branch: pr1.headBranch
            },
            pr2: {
              number: pr2.number,
              title: pr2.title,
              author: pr2.author,
              url: pr2.url,
              branch: pr2.headBranch
            },
            overlappingFiles: overlapping,
            description: `PRs #${pr1.number} and #${pr2.number} modify ${overlapping.length} common file(s)`,
            detectedAt: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`⚠️  Detected ${conflicts.length} conflict(s)`);
    
    // Create scan result
    const scanResult = {
      repo: repoName,
      owner: owner,
      language: repoDetails.language,
      openPullRequestCount: openPRs.length,
      activeBranchCount: openPRs.length + 1, // PRs + main branch
      conflicts: conflicts,
      pullRequests: prWithFiles,
      contributors: contributors,
      scannedAt: new Date().toISOString()
    };
    
    // AI-Enhanced Conflict Analysis Pipeline
    for (const conflict of scanResult.conflicts) {
      console.log(`\n🤖 Analyzing conflict with AI...`);
      
      try {
        // Build context for AI — use authenticated user as owner fallback
        const owner = repo.includes('/') ? repo.split('/')[0] : (req.githubUser?.login || 'unknown');
        const repoName = repo.includes('/') ? repo.split('/')[1] : repo;
        const context = await getCachedContext(conflict, owner, repoName, req.githubToken);
        console.log(`  ✓ Context built`);
        
        // AI reasoning (this is the core!)
        const aiReasoning = await reasonAboutConflict(context);
        console.log(`  ✓ AI analysis complete (confidence: ${(aiReasoning.confidence * 100).toFixed(0)}%)`);
        
        // Decision layer
        const decision = makeDecision(aiReasoning, conflict);
        console.log(`  ✓ Decision made (${decision.urgency} priority)`);
        
        // Attach AI analysis to conflict
        conflict.aiAnalysis = {
          reasoning: aiReasoning,
          decision: decision,
          summary: generateDecisionSummary(decision)
        };
        
        // Cache
        aiAnalysisCache.set(conflict.id, conflict.aiAnalysis);
        
        // Generate approval if needed
        if (decision.requires_approval?.required) {
          let apps = stateStore.getApprovals();
          // Filter out existing pending approvals for this conflict to prevent duplicates
          apps = apps.filter(a => a.id !== `approval-${conflict.id}`);
          apps.push({
            id: `approval-${conflict.id}`,
            type: "ai_conflict_resolution",
            repo: repoName,
            conflictId: conflict.id,
            file: conflict.overlappingFiles?.[0] || 'repository files',
            description: `AI recommends: ${aiReasoning.resolution_options?.[0]?.strategy || 'Manual Review'}`,
            status: "needs_review",
            createdAt: new Date().toISOString()
          });
          stateStore.saveApprovals(apps);
          console.log(`  ✓ Approval request created`);
        }
        
      } catch (aiError) {
        console.error(`  ✗ AI analysis failed:`, aiError.message);
        // Continue without AI analysis
      }
    }
    
    // Compute owner/repoName at this scope for logging
    const scanOwner = repo.includes('/') ? repo.split('/')[0] : (req.githubUser?.login || 'unknown');
    const scanRepoName = repo.includes('/') ? repo.split('/')[1] : repo;
    
    lastScan = scanResult;

    // Log the scan
    addLogEntry({
      phase: "Discovery",
      event: `Repository scanned: ${scanOwner}/${scanRepoName}`,
      details: `${scanResult.openPullRequestCount} open PRs, ${scanResult.activeBranchCount} branches, ${scanResult.conflicts.length} conflict(s) detected and analyzed.`,
      status: scanResult.conflicts.length > 0 ? "detected" : "resolved",
      repo: `${scanOwner}/${scanRepoName}`,
      parties: []
    });

    console.log(`\n✨ Scan complete for ${scanOwner}/${scanRepoName}\n`);
    res.json(scanResult);
    
  } catch (error) {
    console.error('Scan error:', error.response?.data || error.message);
    res.status(500).json({ error: "GitHub scan failed", details: error.message });
  }
});

// ── NEW: AI Analysis Endpoints ───────────────────────────────────

// Get AI analysis for specific conflict
app.get("/api/conflicts/:id/ai-analysis", (req, res) => {
  const conflictId = req.params.id;
  
  // Check cache first
  if (aiAnalysisCache.has(conflictId)) {
    return res.json(aiAnalysisCache.get(conflictId));
  }
  
  // Check in last scan results
  if (lastScan && lastScan.conflicts) {
    const conflict = lastScan.conflicts.find(c => c.id === conflictId);
    if (conflict && conflict.aiAnalysis) {
      return res.json(conflict.aiAnalysis);
    }
  }
  
  res.status(404).json({ error: "AI analysis not found for this conflict" });
});

// Get all AI analyses from last scan
app.get("/api/ai-analyses", (req, res) => {
  const analyses = [];
  
  if (lastScan && lastScan.conflicts) {
    lastScan.conflicts.forEach(conflict => {
      if (conflict.aiAnalysis) {
        analyses.push({
          conflictId: conflict.id,
          aiAnalysis: conflict.aiAnalysis.reasoning,
          decision: conflict.aiAnalysis.decision,
          summary: conflict.aiAnalysis.summary
        });
      }
    });
  }
  
  res.json(analyses);
});

// Get AI statistics
app.get("/api/ai-stats", (req, res) => {
  let totalAnalyses = 0;
  let highConfidence = 0;
  let lowConfidence = 0;
  let totalTokens = 0;
  let avgConfidence = 0;
  
  if (lastScan && lastScan.conflicts) {
    lastScan.conflicts.forEach(conflict => {
      if (conflict.aiAnalysis && conflict.aiAnalysis.reasoning) {
        totalAnalyses++;
        const confidence = conflict.aiAnalysis.reasoning.confidence;
        avgConfidence += confidence;
        
        if (confidence >= 0.8) highConfidence++;
        else if (confidence < 0.7) lowConfidence++;
        
        if (conflict.aiAnalysis.reasoning.token_usage) {
          totalTokens += conflict.aiAnalysis.reasoning.token_usage.total_tokens;
        }
      }
    });
  }
  
  if (totalAnalyses > 0) {
    avgConfidence = avgConfidence / totalAnalyses;
  }
  
  res.json({
    total_analyses: totalAnalyses,
    high_confidence_count: highConfidence,
    low_confidence_count: lowConfidence,
    average_confidence: Math.round(avgConfidence * 100) / 100,
    total_tokens_used: totalTokens,
    estimated_cost: (totalTokens / 1000) * 0.0001 // $0.0001 per 1K tokens
  });
});

// Reanalyze specific conflict with AI
app.post("/api/conflicts/:id/reanalyze", async (req, res) => {
  const conflictId = req.params.id;
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) return res.status(401).json({ error: "Missing GitHub token" });
  
  if (!lastScan || !lastScan.conflicts) {
    return res.status(404).json({ error: "No scan results available" });
  }
  
  const conflict = lastScan.conflicts.find(c => c.id === conflictId);
  if (!conflict) {
    return res.status(404).json({ error: "Conflict not found" });
  }
  
  try {
    const [owner, repo] = lastScan.repo.split('/');
    
    // Rebuild context and reanalyze
    const enrichedContext = await buildConflictContext(conflict, owner, repo, token);
    const aiReasoning = await reasonAboutConflict(enrichedContext);
    const decision = makeDecision(aiReasoning, conflict);
    
    const analysis = {
      reasoning: aiReasoning,
      decision: decision,
      context: enrichedContext,
      summary: generateDecisionSummary(decision),
      reanalyzed_at: new Date().toISOString()
    };
    
    // Update cache
    aiAnalysisCache.set(conflictId, analysis);
    
    // Update conflict in lastScan
    conflict.aiAnalysis = analysis;
    
    addLogEntry({
      phase: "AI Analysis",
      event: `Conflict ${conflictId} reanalyzed`,
      details: `New confidence: ${(aiReasoning.confidence * 100).toFixed(0)}%`,
      status: "reanalyzed",
      repo: lastScan.repo,
      parties: []
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('Reanalysis error:', error);
    res.status(500).json({ error: "Reanalysis failed", details: error.message });
  }
});

// ── Simulation Endpoints (Phase 7) ──────────────────────────────

// Simulate a specific resolution strategy
app.post("/api/conflicts/:id/simulate", async (req, res) => {
  const conflictId = req.params.id;
  const { strategy } = req.body;
  
  if (!lastScan || !lastScan.conflicts) {
    return res.status(404).json({ error: "No scan results available" });
  }
  
  const conflict = lastScan.conflicts.find(c => c.id === conflictId);
  if (!conflict) {
    return res.status(404).json({ error: "Conflict not found" });
  }
  
  try {
    // Get context for simulation
    const context = await getCachedContext(conflict);
    
    // Find the strategy from AI analysis
    let strategyToSimulate = strategy;
    if (!strategyToSimulate && conflict.aiAnalysis?.reasoning?.resolution_options) {
      // Use first recommended strategy if none specified
      strategyToSimulate = conflict.aiAnalysis.reasoning.resolution_options[0];
    }
    
    if (!strategyToSimulate) {
      return res.status(400).json({ error: "No strategy specified and no AI recommendations available" });
    }
    
    // Run simulation
    const simulation = await simulationEngine.simulateStrategy(
      conflict,
      strategyToSimulate,
      context
    );
    
    res.json({
      conflictId,
      strategy: strategyToSimulate.strategy,
      simulation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: "Simulation failed", details: error.message });
  }
});

// Compare multiple strategies for a conflict
app.post("/api/conflicts/:id/compare-strategies", async (req, res) => {
  const conflictId = req.params.id;
  
  if (!lastScan || !lastScan.conflicts) {
    return res.status(404).json({ error: "No scan results available" });
  }
  
  const conflict = lastScan.conflicts.find(c => c.id === conflictId);
  if (!conflict) {
    return res.status(404).json({ error: "Conflict not found" });
  }
  
  try {
    // Get context for simulation
    const context = await getCachedContext(conflict);
    
    // Get strategies from AI analysis
    const strategies = conflict.aiAnalysis?.reasoning?.resolution_options || [];
    
    if (strategies.length === 0) {
      return res.status(400).json({ error: "No resolution strategies available. Run AI analysis first." });
    }
    
    // Compare all strategies
    const comparison = await simulationEngine.compareStrategies(
      conflict,
      strategies,
      context
    );
    
    res.json({
      conflictId,
      comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Strategy comparison error:', error);
    res.status(500).json({ error: "Strategy comparison failed", details: error.message });
  }
});

// Get simulation for all conflicts in last scan
app.get("/api/simulations", async (req, res) => {
  if (!lastScan || !lastScan.conflicts) {
    return res.json({ simulations: [] });
  }
  
  try {
    const simulations = [];
    
    for (const conflict of lastScan.conflicts) {
      if (conflict.aiAnalysis?.reasoning?.resolution_options?.length > 0) {
        const context = await getCachedContext(conflict);
        const strategy = conflict.aiAnalysis.reasoning.resolution_options[0];
        
        const simulation = await simulationEngine.simulateStrategy(
          conflict,
          strategy,
          context
        );
        
        simulations.push({
          conflictId: conflict.id,
          strategy: strategy.strategy,
          successProbability: simulation.predictions.successProbability,
          timeToResolution: simulation.predictions.timeToResolution.realistic,
          riskCount: simulation.risks.length,
          confidence: simulation.confidence
        });
      }
    }
    
    res.json({ simulations, count: simulations.length });
  } catch (error) {
    console.error('Simulations fetch error:', error);
    res.status(500).json({ error: "Failed to fetch simulations", details: error.message });
  }
});

app.get("/api/github/last-scan", (req, res) => {
  res.json(lastScan);
});

// ── Disconnect (clear all session state) ─────────────────────────

app.post("/api/disconnect", (req, res) => {
  console.log("🔌 User disconnected — clearing all scan data and caches");
  lastScan = null;
  aiAnalysisCache.clear();
  stateStore.saveApprovals([]);
  stateStore.saveResolutionLog([]);
  res.json({ status: "disconnected" });
});
// ── Approvals (Phase 8) ─────────────────────────────────────────

// ── Approvals (Phase 8) ─────────────────────────────────────────

app.get("/api/approvals", (req, res) => {
  res.json(stateStore.getApprovals());
});

app.post("/api/approvals/:id/approve", (req, res) => {
  const apps = stateStore.getApprovals();
  const approval = apps.find(a => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: "Not found" });
  approval.status = "approved";
  approval.approver = "Team Lead";
  approval.approvedAt = new Date().toISOString();
  stateStore.saveApprovals(apps);

  addLogEntry({
    phase: "Approval",
    event: `Action approved: ${approval.description}`,
    details: `Team Lead approved BOB's recommended action for ${approval.file}.`,
    status: "approved",
    repo: approval.repo,
    parties: ["Team Lead"]
  });

  res.json(approval);
});

app.post("/api/approvals/:id/dismiss", (req, res) => {
  const apps = stateStore.getApprovals();
  const approval = apps.find(a => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: "Not found" });
  approval.status = "dismissed";
  stateStore.saveApprovals(apps);

  addLogEntry({
    phase: "Resolution",
    event: `Risk dismissed: ${approval.file}`,
    details: `Team Lead dismissed the risk as acceptable. No action taken.`,
    status: "dismissed",
    repo: approval.repo,
    parties: ["Team Lead"]
  });

  res.json(approval);
});

app.post("/api/approvals/:id/create-pr", (req, res) => {
  const apps = stateStore.getApprovals();
  const approval = apps.find(a => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: "Not found" });
  approval.status = "pr_created";
  approval.prUrl = `https://github.com/${approval.repo}/pull/${Math.floor(Math.random() * 100) + 50}`;
  stateStore.saveApprovals(apps);

  addLogEntry({
    phase: "Execution",
    event: `GitHub PR created for ${approval.file}`,
    details: `BOB generated a fix PR after approval. URL: ${approval.prUrl}`,
    status: "action_sent",
    repo: approval.repo,
    parties: ["BOB Assistant", "Team Lead"]
  });

  res.json(approval);
});

// ── Resolution Log (Phase 10) ────────────────────────────────────

function addLogEntry({ phase, event, details, status, repo, parties }) {
  stateStore.appendLogEntry({
    phase,
    event,
    details,
    status,
    repo: repo || null,
    parties: parties || []
  });
}

app.get("/api/resolution-log", (req, res) => {
  res.json(stateStore.getResolutionLog());
});

// ── Mock Data Endpoints ──────────────────────────────────────────



app.get("/api/teams", optionalAuth, async (req, res) => {
  try {
    // If we have a recent scan with contributors, use real data
    if (lastScan && lastScan.contributors && lastScan.contributors.length > 0) {
      const teamName = lastScan.repo || "Development Team";
      const teamId = teamName.toLowerCase().replace(/\s+/g, '-');
      
      // Map contributors to team members with roles based on contribution count
      const members = lastScan.contributors.map(contributor => {
        let role = 'Developer';
        if (contributor.contributions > 100) {
          role = 'Lead Developer';
        } else if (contributor.contributions > 50) {
          role = 'Senior Developer';
        } else if (contributor.contributions > 20) {
          role = 'Developer';
        } else {
          role = 'Contributor';
        }
        
        return {
          name: contributor.username,
          avatar: contributor.avatar,
          role: role,
          contributions: contributor.contributions,
          url: contributor.url
        };
      });
      
      // Sort by contributions (highest first)
      members.sort((a, b) => b.contributions - a.contributions);
      
      const team = {
        id: teamId,
        name: teamName,
        lead: members[0]?.name || 'Unknown',
        members: members,
        repos: [lastScan.repo],
        alertChannel: `#${teamId}-alerts`,
        language: lastScan.language,
        scannedAt: lastScan.scannedAt
      };
      
      return res.json([team]);
    }
    
    // Fallback to mock data if no scan has been performed
    res.json([
      {
        id: "core-banking", name: "Core Banking", lead: "Maya",
        members: [
          { name: "Maya", avatar: "MK", role: "Lead" },
          { name: "Zain", avatar: "ZM", role: "Senior Dev" },
          { name: "Thando", avatar: "TN", role: "Backend Dev" },
          { name: "Siya", avatar: "SN", role: "DevOps" },
          { name: "Rudo", avatar: "RC", role: "QA Engineer" }
        ],
        repos: ["payment-service", "transaction-engine"],
        alertChannel: "#core-banking-alerts"
      },
      {
        id: "frontend-ux", name: "Frontend UX", lead: "Thato",
        members: [
          { name: "Thato", avatar: "TM", role: "Lead" },
          { name: "Naledi", avatar: "NB", role: "UI Engineer" },
          { name: "Kabelo", avatar: "KS", role: "React Dev" }
        ],
        repos: ["customer-portal", "admin-dashboard"],
        alertChannel: "#frontend-ux-alerts"
      }
    ]);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.get("/api/alerts", (req, res) => {
  let alerts = [
    { id: 1, title: "Critical Conflict: Payment Routing", message: "Logic collision in src/payment.js between PR #12 and PR #14. Both PRs modify the checkout flow — merging either could break transaction routing.", severity: "high", channel: "GitHub", repo: "payment-service", team: "Core Banking", read: false, time: "2 mins ago" },
    { id: 2, title: "Doc Drift: Auth Endpoint", message: "README.md references POST /api/login but the codebase now uses POST /api/v2/login. External integrators may hit 404s.", severity: "medium", channel: "DocSync", repo: "auth-service", team: "Security & Ops", read: false, time: "15 mins ago" },
    { id: 3, title: "Approval Granted", message: "Maya approved BOB's coordination comment for Conflict Resolution #4. GitHub PR comment has been posted.", severity: "low", channel: "Workflow", repo: "payment-service", team: "Core Banking", read: true, time: "1 hour ago" },
    { id: 4, title: "Schema Migration Overlap", message: "Two PRs modifying src/db/schema.sql opened concurrently by Lebo and Priya. Column additions may conflict on deploy.", severity: "high", channel: "GitHub", repo: "transaction-engine", team: "Core Banking", read: false, time: "3 hours ago" },
    { id: 5, title: "Stale Branch Warning", message: "Branch feat/dark-mode on customer-portal is 6 commits behind main. Risk of silent regression on merge.", severity: "medium", channel: "System", repo: "customer-portal", team: "Frontend UX", read: false, time: "4 hours ago" },
    { id: 6, title: "Scan Complete", message: "BOB successfully scanned 14 connected repositories. 3 new risks identified, 2 resolved since last scan.", severity: "low", channel: "System", repo: "all", team: "Platform", read: true, time: "5 hours ago" },
    { id: 7, title: "Dependency Conflict", message: "PR #215 and PR #105 both modify package.json with incompatible version bumps for express (4.18 vs 5.0-beta).", severity: "high", channel: "GitHub", repo: "auth-service", team: "Security & Ops", read: false, time: "6 hours ago" },
    { id: 8, title: "DocSync PR Merged", message: "BOB's auto-generated PR to update CONTRIBUTING.md was merged by Thato. Test commands now reflect npm run test:unit.", severity: "low", channel: "DocSync", repo: "customer-portal", team: "Frontend UX", read: true, time: "1 day ago" }
  ];

  if (lastScan && lastScan.conflicts && lastScan.conflicts.length > 0) {
    const c = lastScan.conflicts[0];
    const newAlert = {
      id: "scan-" + Date.now(),
      title: "Coordination Risk: " + lastScan.repo,
      message: c.explanation || `Logic collision detected in ${lastScan.repo}. Modifying ${c.overlappingFiles.join(', ')}.`,
      severity: c.riskLevel === "High" ? "high" : "medium",
      channel: "GitHub",
      repo: lastScan.repo,
      team: "Assigned Team",
      read: false,
      time: "Just now"
    };
    alerts.unshift(newAlert);
  }

  res.json(alerts);
});

app.get("/api/docsync", (req, res) => {
  const repo = req.query.repo || "";
  
  // Hash repo name for consistent but varied assignment
  let hash = 0;
  for (let i = 0; i < repo.length; i++) hash += repo.charCodeAt(i);
  
  const warningsPool = [
    [
      { file: "README.md", documentedEndpoint: "POST /api/login", actualEndpoint: "POST /api/v2/login", suggestedFix: "Update README.md to reference the v2 auth endpoint.", status: "outdated" },
      { file: "docs/auth.md", documentedEndpoint: "GET /auth/status", actualEndpoint: "GET /api/v2/auth/status", suggestedFix: "Update docs/auth.md to match the v2 route prefix.", status: "outdated" }
    ],
    [
      { file: "docs/payment.md", documentedEndpoint: "POST /api/checkout", actualEndpoint: "POST /api/payments/checkout", suggestedFix: "Update docs/payment.md to reflect the new /payments router.", status: "outdated" },
      { file: "CHANGELOG.md", documentedEndpoint: "v2.1.0 — Feb 2026", actualEndpoint: "v2.3.1 — May 2026", suggestedFix: "Add missing changelog entries for v2.2.0 and v2.3.1 releases.", status: "outdated" }
    ],
    [
      { file: "api-reference.md", documentedEndpoint: "GET /users/:id", actualEndpoint: "GET /api/v1/users/:id", suggestedFix: "Prepend /api/v1 prefix to all user endpoints in API reference.", status: "outdated" },
      { file: "CONTRIBUTING.md", documentedEndpoint: "npm run test", actualEndpoint: "npm run test:unit", suggestedFix: "Update test command in CONTRIBUTING.md to reflect the new test:unit script.", status: "outdated" },
      { file: "README.md", documentedEndpoint: "Requires Node v14+", actualEndpoint: "Requires Node v18+", suggestedFix: "Bump the minimum Node.js version in README prerequisites.", status: "outdated" }
    ],
    [
      { file: "docs/deployment.md", documentedEndpoint: "docker build -t app .", actualEndpoint: "docker compose build", suggestedFix: "Update deployment docs to use Docker Compose workflow.", status: "outdated" }
    ],
    [
      { file: "docs/webhooks.md", documentedEndpoint: "POST /hooks/receive", actualEndpoint: "POST /api/webhooks/inbound", suggestedFix: "Update webhooks documentation to match new inbound route.", status: "outdated" },
      { file: "README.md", documentedEndpoint: "npm start", actualEndpoint: "npm run serve", suggestedFix: "Update start command in README — project now uses 'serve' script.", status: "outdated" },
      { file: "SECURITY.md", documentedEndpoint: "Report to security@old.co", actualEndpoint: "Report to security@ibm-ce.dev", suggestedFix: "Update security contact email to current team address.", status: "outdated" }
    ]
  ];
  
  const scenarioIndex = hash % warningsPool.length;

  res.json({
    warnings: warningsPool[scenarioIndex]
  });
});



// ── Start ────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`BOB backend running on http://localhost:${PORT}`);
});