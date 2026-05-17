import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderConflictRadar(container: HTMLElement) {
  const token = localStorage.getItem("github_token");
  
  // Gate: require GitHub connection
  if (!token) {
    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">AI-Powered Conflict Detection</p>
        <h1>Conflict Radar AI</h1>
        <p class="subtitle">Connect your GitHub account and scan a repository to begin.</p>
      </section>
      <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <p style="color:var(--text-secondary); font-size:16px; max-width:400px">Connect your GitHub account first, then scan a repository to see AI-powered conflict analysis.</p>
        <button class="btn-primary" id="goto-connect-cr">Connect GitHub</button>
      </div>
    `;
    document.getElementById('goto-connect-cr')?.addEventListener('click', () => {
      window.location.href = `${API}/auth/github`;
    });
    return;
  }

  container.innerHTML = `<div class="loading-state">Analyzing coordination risks with AI...</div>`;
  
  try {
    const lastScanRes = await axios.get(`${API}/github/last-scan`);
    const scan = lastScanRes.data;

    if (!scan) {
      container.innerHTML = `
        <section class="hero">
          <p class="eyebrow">AI-Powered Conflict Detection</p>
          <h1>Conflict Radar AI</h1>
          <p class="subtitle">No repository scanned yet. Connect and scan a repo first.</p>
        </section>
        <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <p style="color:var(--text-secondary); font-size:16px; max-width:400px">The AI-powered Conflict Radar will analyze conflicts using IBM watsonx.ai once BOB scans a repository.</p>
          <button class="btn-primary" id="goto-repositories">Connect Repository</button>
        </div>
      `;
      document.getElementById('goto-repositories')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'repositories' }));
      });
      return;
    }

    // Fetch AI analyses
    const aiAnalysesRes = await axios.get(`${API}/ai-analyses`);
    const aiAnalyses = aiAnalysesRes.data;
    
    // Fetch AI stats
    const aiStatsRes = await axios.get(`${API}/ai-stats`);
    const aiStats = aiStatsRes.data;

    renderScanResults(container, scan, aiAnalyses, aiStats);
  } catch (error) {
    console.error('Error loading conflict data:', error);
    container.innerHTML = `<div class="card large"><h2>Could not load conflict data</h2><p style="color:var(--text-secondary)">Make sure the backend is running and watsonx.ai is configured.</p></div>`;
  }
}

function renderScanResults(container: HTMLElement, scan: any, aiAnalyses: any[], aiStats: any) {
  const conflicts = scan.conflicts || [];
  const totalTokens = aiStats.totalTokensUsed || 0;
  const avgConfidence = aiAnalyses.length > 0 
    ? (aiAnalyses.reduce((sum: number, a: any) => sum + (a.aiAnalysis?.confidence || 0), 0) / aiAnalyses.length * 100).toFixed(0)
    : 0;

  container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Phase 4-5 · AI Coordination Analysis</p>
        <h1 >Conflict Radar <span class="badge" style="background:var(--accent-blue);color:white;border:none">WatsonX</span></h1>
        <p class="subtitle">${scan.repo} · ${scan.openPullRequestCount} open PRs · ${scan.activeBranchCount} branches · ${conflicts.length} risk${conflicts.length !== 1 ? 's' : ''}</p>
      </section>

    <!-- AI Stats Dashboard -->
    <section class="grid stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px">
      <div class="card stat-card ai-stat-card">
        <p class="label">AI Analyses</p>
        <h2>${aiAnalyses.length}</h2>
        <p class="stat-detail">Conflicts processed</p>
      </div>
      <div class="card stat-card ai-stat-card">
        <p class="label">Avg Confidence</p>
        <h2 class="${Number(avgConfidence) >= 80 ? 'safe' : 'warning'}">${avgConfidence}%</h2>
        <p class="stat-detail">AI certainty level</p>
      </div>
      <div class="card stat-card ai-stat-card">
        <p class="label">Tokens Used</p>
        <h2>${totalTokens}</h2>
        <p class="stat-detail">watsonx.ai API calls</p>
      </div>
      <div class="card stat-card ai-stat-card">
        <p class="label">Model</p>
        <h2 style="font-size: 16px; margin-top: 8px">Granite 3-8B</h2>
        <p class="stat-detail">IBM Foundation Model</p>
      </div>
    </section>

    ${conflicts.length === 0 ? `
      <div class="summary-card healthy-summary">
        <h2 style="font-size:22px; margin:0 0 8px">✓ No Coordination Risks Found</h2>
        <p style="margin:0; font-size:14px">All open PRs are modifying independent files. No overlapping work detected.</p>
      </div>
    ` : `
      <div class="grid" style="gap:24px">
        ${conflicts.map((c: any, idx: number) => {
          const aiAnalysis = aiAnalyses.find((a: any) => a.conflictId === c.id);
          return renderAIConflictCard(c, idx, aiAnalysis);
        }).join("")}
      </div>
    `}
  `;

  // Wire reanalyze buttons
  container.querySelectorAll('.reanalyze-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const conflictId = (e.currentTarget as HTMLElement).getAttribute('data-conflict-id');
      if (!conflictId) return;
      
      const button = e.currentTarget as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Analyzing...';
      
      try {
        const token = localStorage.getItem("github_token");
        await axios.post(`${API}/conflicts/${conflictId}/reanalyze`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        // Reload the page
        renderConflictRadar(container);
      } catch (error) {
        console.error('Reanalysis failed:', error);
        button.textContent = 'Reanalyze Failed';
        setTimeout(() => {
          button.disabled = false;
          button.textContent = '🔄 Reanalyze';
        }, 2000);
      }
    });
  });

  // Wire navigation buttons
  container.querySelectorAll('.goto-approvals-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'approvals' }));
    });
  });

  // Wire expand/collapse buttons
  container.querySelectorAll('.toggle-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const detailsId = target.getAttribute('data-target');
      const details = document.getElementById(detailsId!);
      if (details) {
        const isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
        target.textContent = isHidden ? '▼ Hide Details' : '▶ Show Details';
      }
    });
  });
}

function renderAIConflictCard(c: any, idx: number, aiAnalysis: any): string {
  const riskColor = c.riskLevel === 'High' ? 'critical' : (c.riskLevel === 'Medium' ? 'warning' : 'healthy');
  const cardBorder = c.riskLevel === 'High' ? 'border-color: rgba(239, 68, 68, 0.3);' : '';
  
  const hasAI = aiAnalysis && aiAnalysis.aiAnalysis;
  const confidence = hasAI ? (aiAnalysis.aiAnalysis.confidence * 100).toFixed(0) : 'N/A';
  const riskAssessment = hasAI ? aiAnalysis.aiAnalysis.risk_assessment : null;
  const resolutionOptions = hasAI ? aiAnalysis.aiAnalysis.resolution_options : [];
  const decision = aiAnalysis?.decision;

  return `
    <div class="card ai-conflict-card" style="padding:0; overflow:hidden; ${cardBorder}">
      <!-- Card Header with AI Badge -->
      <div style="padding:20px 24px; background:var(--bg-base); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color)">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap: wrap">
          <span class="status-pill ${riskColor}" style="font-size:12px; padding:4px 12px">${c.riskLevel} Risk</span>
          ${hasAI ? `
            <span class="ai-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/></svg>
              AI Analyzed · ${confidence}% confidence
            </span>
          ` : `
            <span class="ai-badge" style="background: rgba(245, 158, 11, 0.1); color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600">
              ⚠️ No AI Analysis
            </span>
          `}
          <span style="font-size:12px; color:var(--text-secondary)">Signal #${idx + 1}</span>
        </div>
        <button class="reanalyze-btn" data-conflict-id="${c.id}" style="background: var(--accent-blue); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600">
          🔄 Reanalyze
        </button>
      </div>

      <div style="padding:24px">
        ${hasAI ? renderAIInsights(c, aiAnalysis, riskAssessment, resolutionOptions, decision, idx) : renderNoAIFallback()}
      </div>
    </div>
  `;
}

function renderAIInsights(c: any, aiAnalysis: any, riskAssessment: any, resolutionOptions: any[], decision: any, idx: number): string {
  const ai = aiAnalysis.aiAnalysis;
  const urgencyColor = decision?.urgency === 'critical' ? 'var(--accent-red)' : 
                       decision?.urgency === 'high' ? 'var(--accent-yellow)' : 
                       decision?.urgency === 'medium' ? 'var(--accent-blue)' : 'var(--accent-green)';

  return `
    <!-- AI Conflict Explanation -->
    <div style="margin-bottom:24px">
      <p class="label" style="margin-bottom:8px; font-size:10px">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/></svg>
        AI Conflict Analysis
      </p>
      <p style="font-size:14px; line-height:1.7; margin:0; color:var(--text-primary); background: var(--bg-base); padding: 16px; border-radius: 8px; border-left: 3px solid var(--accent-blue)">
        ${ai.conflict_explanation || 'No explanation provided'}
      </p>
    </div>

    <!-- Risk Assessment -->
    ${riskAssessment ? `
      <div style="margin-bottom:24px">
        <p class="label" style="margin-bottom:12px; font-size:10px">AI Risk Assessment</p>
        <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
            <div>
              <span style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Risk Level</span>
              <h3 style="margin: 4px 0 0; font-size: 18px; color: ${riskAssessment.level === 'high' ? 'var(--accent-red)' : riskAssessment.level === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${riskAssessment.level.toUpperCase()}</h3>
            </div>
            <div style="text-align: right">
              <span style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Confidence</span>
              <h3 style="margin: 4px 0 0; font-size: 18px">${(riskAssessment.confidence * 100).toFixed(0)}%</h3>
            </div>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin: 0 0 12px">${riskAssessment.reasoning}</p>
          ${riskAssessment.impact_areas && riskAssessment.impact_areas.length > 0 ? `
            <div style="display: flex; gap: 6px; flex-wrap: wrap">
              ${riskAssessment.impact_areas.map((area: string) => `
                <span class="flag-pill flag-file">${area}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Relationship Intelligence -->
    ${ai.relationship_insights ? `
      <div style="margin-bottom:24px">
        <p class="label" style="margin-bottom:12px; font-size:10px">Relationship Intelligence</p>
        <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px">
          <p style="font-size: 13px; line-height: 1.6; color: var(--text-primary); margin: 0 0 12px; font-weight: 600">
            ${ai.relationship_insights.summary || ''}
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Developer Dynamics</span>
              <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary)">
                ${ai.relationship_insights.developers?.relationshipStatus || 'Unknown'} — ${ai.relationship_insights.developers?.recommendation || ''}
              </p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Team Friction Score</span>
              <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary)">
                ${ai.relationship_insights.teams?.teamFrictionScore || 0}/100
              </p>
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Resolution Options -->
    ${resolutionOptions.length > 0 ? `
      <div style="margin-bottom:24px">
        <p class="label" style="margin-bottom:12px; font-size:10px">AI-Recommended Resolution Strategies</p>
        <div style="display: flex; flex-direction: column; gap: 12px">
          ${resolutionOptions.map((option: any, optIdx: number) => `
            <div class="resolution-option" style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; transition: all 0.15s ease">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px">
                <h4 style="margin: 0; font-size: 14px; color: var(--text-primary)">
                  <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: ${optIdx === 0 ? 'var(--accent-green)' : 'var(--bg-surface)'}; color: ${optIdx === 0 ? 'white' : 'var(--text-secondary)'}; text-align: center; line-height: 20px; font-size: 11px; margin-right: 8px">${optIdx + 1}</span>
                  ${option.strategy}
                </h4>
                <span class="flag-pill" style="font-size: 10px">${option.effort || 'Medium'} Effort</span>
              </div>
              <p style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin: 0 0 12px; padding-left: 28px">${option.description}</p>
              <button class="toggle-details-btn" data-target="option-details-${idx}-${optIdx}" style="background: transparent; border: none; color: var(--accent-blue); font-size: 12px; cursor: pointer; padding: 4px 0; font-weight: 600; padding-left: 28px">
                ▶ Show Details
              </button>
              <div id="option-details-${idx}-${optIdx}" style="display: none; padding-left: 28px; margin-top: 12px">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
                  <div>
                    <p style="font-size: 11px; color: var(--text-tertiary); margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em">Pros</p>
                    <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: var(--text-secondary); line-height: 1.6">
                      ${(Array.isArray(option.pros) ? option.pros : (typeof option.pros === 'string' ? [option.pros] : [])).map((pro: string) => `<li>${pro}</li>`).join('')}
                    </ul>
                  </div>
                  <div>
                    <p style="font-size: 11px; color: var(--text-tertiary); margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em">Cons</p>
                    <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: var(--text-secondary); line-height: 1.6">
                      ${(Array.isArray(option.cons) ? option.cons : (typeof option.cons === 'string' ? [option.cons] : [])).map((con: string) => `<li>${con}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Decision Layer Output -->
    ${decision ? `
      <div style="margin-bottom:24px">
        <p class="label" style="margin-bottom:12px; font-size:10px">Decision Layer · Automated Workflow</p>
        <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px">
            <div>
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Urgency</span>
              <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${urgencyColor}"></span>
                <strong style="font-size: 14px; text-transform: capitalize">${decision.urgency?.level || 'Medium'}</strong>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Priority Score</span>
              <div style="margin-top: 4px">
                <strong style="font-size: 14px">${decision.priority || 50}/100</strong>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Approval Required</span>
              <div style="margin-top: 4px">
                <strong style="font-size: 14px; color: ${decision.requires_approval?.required ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${decision.requires_approval?.required ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          </div>
          ${decision.execution_plan ? `
            <div style="border-top: 1px solid var(--border-color); padding-top: 12px">
              <p style="font-size: 11px; color: var(--text-tertiary); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em">Execution Plan</p>
              <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.8">
                ${decision.execution_plan.steps.map((step: any) => `<li>${step.description}</li>`).join('')}
              </ol>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Recommended Owner -->
    ${ai.recommended_owner ? `
      <div style="margin-bottom:24px">
        <p class="label" style="margin-bottom:8px; font-size:10px">AI-Recommended Owner</p>
        <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px">
          <div class="avatar-sm">${ai.recommended_owner.substring(0, 2).toUpperCase()}</div>
          <div>
            <strong style="font-size: 14px">${ai.recommended_owner}</strong>
            <p style="margin: 0; font-size: 12px; color: var(--text-secondary)">Best positioned to coordinate resolution</p>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Overlapping Files -->
    <div style="margin-bottom:24px">
      <p class="label" style="margin-bottom:8px; font-size:10px">Overlapping Files</p>
      <div style="display:flex; gap:6px; flex-wrap:wrap">
        ${c.overlappingFiles.map((f: string) => `<code style="font-size:12px">${f}</code>`).join("")}
      </div>
    </div>

    <!-- Approval Gate -->
    ${decision?.requires_approval ? `
      <div style="padding-top:20px; border-top:1px solid var(--border-color)">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px">
          <div>
            <p style="margin:0; font-size:12px; color:var(--text-secondary)">
              <strong style="color:var(--accent-yellow)">⚠️ Approval required</strong> — AI recommends human review before action.
            </p>
          </div>
          <div style="display:flex; gap:8px">
            <button class="btn-primary goto-approvals-btn" style="padding:8px 16px; font-size:13px">Review in Approvals</button>
          </div>
        </div>
      </div>
    ` : `
      <div style="padding-top:20px; border-top:1px solid var(--border-color)">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px">
          <div>
            <p style="margin:0; font-size:12px; color:var(--text-secondary)">
              <strong style="color:var(--accent-green)">✓ No approval needed</strong> — AI confidence is high enough for automated handling.
            </p>
          </div>
        </div>
      </div>
    `}
  `;
}

function renderNoAIFallback(): string {
  return `
    <div style="text-align: center; padding: 40px 20px">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5" style="margin-bottom: 16px">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 style="margin: 0 0 8px; font-size: 16px">No AI Analysis Available</h3>
      <p style="margin: 0 0 16px; color: var(--text-secondary); font-size: 14px">This conflict hasn't been analyzed by watsonx.ai yet.</p>
      <p style="margin: 0; font-size: 13px; color: var(--text-tertiary)">Click "Reanalyze" above to generate AI insights.</p>
    </div>
  `;
}

// Made with Bob
