import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderRepoActivity(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading repository activity...</div>`;

  try {
    const lastScanRes = await axios.get(`${API}/github/last-scan`);
    const scan = lastScanRes.data;

    if (!scan) {
      container.innerHTML = `
        <section class="hero">
          <p class="eyebrow">Phase 2 · Work Discovery</p>
          <h1 >Repo Activity</h1>
          <p class="subtitle">No repository scanned yet. Connect a repo first.</p>
        </section>
        <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <p style="color:var(--text-secondary); font-size:16px; max-width:400px">Use the <strong>Connect Repo</strong> page to authorize GitHub and scan a repository.</p>
          <button class="btn-primary" id="goto-connect">Connect Repository</button>
        </div>
      `;
      document.getElementById('goto-connect')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'connect' }));
      });
      return;
    }

    // We have scan data — render the activity view
    const conflictCount = scan.conflicts?.length || 0;
    const prCount = scan.openPullRequestCount || 0;
    const branchCount = scan.activeBranchCount || 0;

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Phase 2 · Work Discovery</p>
        <h1 >${scan.repo}</h1>
        <p class="subtitle">BOB is monitoring this repository for coordination risks.</p>
      </section>

      <!-- Stats Row -->
      <div class="grid stats-grid" style="margin-bottom:32px">
        <div class="card" style="text-align:center">
          <p class="label">Open PRs</p>
          <h2 style="font-size:42px; margin:0; color:var(--accent-blue)">${prCount}</h2>
        </div>
        <div class="card" style="text-align:center">
          <p class="label">Active Branches</p>
          <h2 style="font-size:42px; margin:0; color:var(--accent-blue)">${branchCount}</h2>
        </div>
        <div class="card" style="text-align:center">
          <p class="label">Collision Risks</p>
          <h2 style="font-size:42px; margin:0; color:${conflictCount > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${conflictCount}</h2>
        </div>
        <div class="card" style="text-align:center">
          <p class="label">Last Scanned</p>
          <h2 style="font-size:16px; margin:0; color:var(--text-primary)">${new Date(scan.lastScanned).toLocaleTimeString()}</h2>
        </div>
      </div>

      ${conflictCount > 0 ? `
        <div class="summary-card" style="margin-bottom:32px; display:flex; justify-content:space-between; align-items:center">
          <div>
            <h2 style="font-size:22px; margin:0 0 8px">⚠ ${conflictCount} Coordination Risk${conflictCount > 1 ? 's' : ''} Detected</h2>
            <p style="margin:0; font-size:14px; color:#e2e8f0">BOB found overlapping work across open PRs. Review the Conflict Radar for details.</p>
          </div>
          <button class="btn-primary" id="goto-radar" style="white-space:nowrap">Open Conflict Radar →</button>
        </div>
      ` : `
        <div class="summary-card healthy-summary" style="margin-bottom:32px">
          <h2 style="font-size:22px; margin:0 0 8px">✓ No Coordination Risks</h2>
          <p style="margin:0; font-size:14px">All open PRs are working on independent files. No overlap detected.</p>
        </div>
      `}

      <!-- Active Work Items -->
      <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center">
        <p class="label" style="margin:0">Active Work Items</p>
        <button class="btn-secondary rescan-btn" style="padding:6px 16px; font-size:12px">↻ Rescan</button>
      </div>

      <div class="grid" style="gap:12px" id="work-items-list">
        ${renderWorkItems(scan)}
      </div>
    `;

    document.getElementById('goto-radar')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'conflict-radar' }));
    });

    container.querySelector('.rescan-btn')?.addEventListener('click', async () => {
      const [owner, repo] = scan.repo.split('/');
      const token = localStorage.getItem('github_token');
      if (!token || !owner || !repo) return;
      container.innerHTML = `<div class="loading-state">Rescanning ${scan.repo}...</div>`;
      try {
        await axios.get(`${API}/github/repos/${owner}/${repo}/scan`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        renderRepoActivity(container);
      } catch {
        container.innerHTML = `<div class="card large"><h2>Rescan failed</h2></div>`;
      }
    });

  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load repository activity</h2></div>`;
  }
}

function renderWorkItems(scan: any): string {
  // Combine info from conflicts to show all PRs involved  
  const prMap = new Map<number, any>();

  // Extract PR details from conflicts
  if (scan.conflicts) {
    for (const c of scan.conflicts) {
      if (c.parties?.authorA) {
        prMap.set(c.parties.authorA.pr, {
          number: c.parties.authorA.pr,
          title: c.parties.authorA.title,
          author: c.parties.authorA.name,
          branch: c.parties.authorA.branch,
          hasRisk: true,
          riskLevel: c.riskLevel,
          riskScore: c.score
        });
      }
      if (c.parties?.authorB) {
        prMap.set(c.parties.authorB.pr, {
          number: c.parties.authorB.pr,
          title: c.parties.authorB.title,
          author: c.parties.authorB.name,
          branch: c.parties.authorB.branch,
          hasRisk: true,
          riskLevel: c.riskLevel,
          riskScore: c.score
        });
      }
    }
  }

  // If we have no PR data from conflicts, show a summary
  if (prMap.size === 0 && scan.openPullRequestCount === 0) {
    return `<div class="card" style="text-align:center; padding:40px; color:var(--text-secondary)">No open pull requests found in this repository.</div>`;
  }

  if (prMap.size === 0) {
    return `<div class="card" style="padding:24px; color:var(--text-secondary)">${scan.openPullRequestCount} open PR(s) detected — no overlapping files found. All work is independent.</div>`;
  }

  return Array.from(prMap.values()).map(pr => `
    <div class="card work-item" style="padding:16px; display:flex; justify-content:space-between; align-items:center">
      <div style="display:flex; align-items:center; gap:16px">
        <div class="avatar" style="width:36px; height:36px; font-size:12px; background:${pr.hasRisk ? 'rgba(250,204,21,0.15)' : 'rgba(34,197,94,0.15)'}; color:${pr.hasRisk ? 'var(--accent-yellow)' : 'var(--accent-green)'}">
          ${pr.author.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px">
            <strong style="font-size:14px">PR #${pr.number}</strong>
            <span style="color:var(--text-secondary); font-size:13px">— ${pr.title || 'Untitled'}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-secondary)">
            <span>by <strong style="color:var(--text-primary)">${pr.author}</strong></span>
            <span>·</span>
            <code style="font-size:11px; padding:2px 6px">${pr.branch}</code>
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        ${pr.hasRisk ? `
          <span class="status-pill ${pr.riskLevel === 'High' ? 'critical' : 'warning'}" style="font-size:11px; padding:4px 10px">
            ${pr.riskLevel} Risk
          </span>
        ` : `
          <span class="status-pill healthy" style="font-size:11px; padding:4px 10px">Clear</span>
        `}
      </div>
    </div>
  `).join('');
}
