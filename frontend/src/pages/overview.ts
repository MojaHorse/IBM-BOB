import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderOverview(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Loading overview...</div>`;

  try {
    const token = localStorage.getItem("github_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const [reposRes, alertsRes, approvalsRes] = await Promise.all([
      axios.get(`${API}/repos-overview`, { headers }),
      axios.get(`${API}/alerts`),
      axios.get(`${API}/approvals`)
    ]);

    const repos = reposRes.data;
    const alerts = alertsRes.data;
    const approvals = approvalsRes.data;
    const pending = approvals.filter((a: any) => a.status === "needs_review").length;
    const unread = alerts.filter((a: any) => !a.read).length;

    const totalPRs = repos.reduce((s: number, r: any) => s + r.openPRs, 0);
    const totalConflicts = repos.reduce((s: number, r: any) => s + r.conflictRisks, 0);
    const healthy = repos.filter((r: any) => r.status === "Healthy").length;
    const warning = repos.filter((r: any) => r.status === "Warning").length;
    const critical = repos.filter((r: any) => r.status === "Critical").length;

    // Fetch actual DocSync warnings for the first few repos
    const repoNames = repos.slice(0, 5).map((r: any) => r.name);
    const docSyncResults = await Promise.all(
      repoNames.map((name: string) => axios.get(`${API}/docsync?repo=${name}`).catch(() => ({ data: { warnings: [] } })))
    );
    const allDocWarnings = docSyncResults.flatMap((r: any, i: number) =>
      r.data.warnings.map((w: any) => ({ ...w, repo: repoNames[i] }))
    );

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Organization Dashboard</p>
        <h1>IBM Client Engineering</h1>
        <p class="subtitle">Repo Control Room — monitoring ${repos.length} repositories across 5 teams</p>
      </section>

      <section class="grid stats-grid">
        <div class="card stat-card">
          <p class="label">Repos Monitored</p>
          <h2>${repos.length}</h2>
          <p class="stat-detail">${healthy} healthy · ${warning + critical} need attention</p>
        </div>
        <div class="card stat-card">
          <p class="label">Open PRs</p>
          <h2>${totalPRs}</h2>
          <p class="stat-detail">Across all repositories</p>
        </div>
        <div class="card stat-card">
          <p class="label">Conflict Risks</p>
          <h2 class="${totalConflicts > 0 ? 'warning' : 'safe'}">${totalConflicts}</h2>
          <p class="stat-detail">${totalConflicts === 0 ? 'All clear' : 'Needs attention'}</p>
        </div>
        <div class="card stat-card">
          <p class="label">Pending Approvals</p>
          <h2 class="${pending > 0 ? 'warning' : 'safe'}">${pending}</h2>
          <p class="stat-detail">${pending === 0 ? 'Nothing queued' : 'Awaiting review'}</p>
        </div>
      </section>

      <section class="grid stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="card stat-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-green)"></span>
            <p class="label" style="margin:0">Healthy</p>
          </div>
          <h2 class="safe">${healthy}</h2>
        </div>
        <div class="card stat-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-yellow)"></span>
            <p class="label" style="margin:0">Warning</p>
          </div>
          <h2 class="warning">${warning}</h2>
        </div>
        <div class="card stat-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-red)"></span>
            <p class="label" style="margin:0">Critical</p>
          </div>
          <h2 style="color:var(--accent-red)">${critical}</h2>
        </div>
      </section>

      <section class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin:0">All Repositories</h2>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="badge">${repos.length} total</span>
            <button class="btn-primary" id="link-repo-btn" style="padding:6px 14px;font-size:13px">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Link Repo
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Repository</th><th>Team</th><th>Status</th><th>PRs</th><th>Conflicts</th><th>DocSync</th><th>Risk Score</th>
            </tr></thead>
            <tbody>
              ${repos.map((r: any) => `<tr class="repo-row-click" data-repo="${r.name}" style="cursor:pointer">
                <td><strong>${r.name}</strong></td>
                <td>${r.team}</td>
                <td><span class="status-pill ${r.status.toLowerCase()}">${r.status}</span></td>
                <td>${r.openPRs}</td>
                <td>${r.conflictRisks}</td>
                <td>${r.docSyncWarnings}</td>
                <td><span class="risk-bar"><span class="risk-fill" style="width:${r.riskScore}%;background:${r.riskScore >= 50 ? 'var(--accent-red)' : r.riskScore >= 20 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></span></span> ${r.riskScore}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid two-column">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h2 style="margin:0;font-size:18px">Recent Alerts</h2>
            <span class="count-badge">${unread} new</span>
          </div>
          ${alerts.slice(0, 4).map((a: any) => `
            <div class="alert ${a.severity === 'high' ? 'alert-high' : ''}">
              <strong>${a.title}</strong>
              <p>${a.message}</p>
              <p style="font-size:12px;color:var(--text-tertiary)">${a.repo || ''} · ${a.team || ''} · ${a.channel}</p>
            </div>
          `).join("")}
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h2 style="margin:0;font-size:18px">DocSync Warnings</h2>
            <span class="count-badge">${allDocWarnings.length}</span>
          </div>
          <p style="margin-bottom:12px;color:var(--text-secondary);font-size:14px">${allDocWarnings.length} documentation issue(s) detected</p>
          ${allDocWarnings.length === 0 ? '<p class="safe">✓ All documentation is in sync.</p>' : allDocWarnings.slice(0, 3).map((w: any) => `
            <div class="alert">
              <strong>${w.file} — ${w.repo}</strong>
              <p>Docs say: <code>${w.documentedEndpoint}</code></p>
              <p>Code uses: <code>${w.actualEndpoint}</code></p>
            </div>
          `).join("")}
        </div>
      </section>
    `;
    // Wire clickable repo rows — set as active repo + navigate
    container.querySelectorAll('.repo-row-click').forEach(row => {
      row.addEventListener('click', () => {
        const repoName = (row as HTMLElement).getAttribute('data-repo');
        if (repoName) {
          window.dispatchEvent(new CustomEvent('bob-set-repo', { detail: repoName }));
        }
        window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'repositories' }));
      });
    });

    // Wire Link Repo button
    document.getElementById('link-repo-btn')?.addEventListener('click', () => {
      const token2 = localStorage.getItem('github_token');
      if (!token2) {
        window.location.href = `${API}/auth/github`;
      } else {
        window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'repositories' }));
      }
    });

  } catch {
    container.innerHTML = `<div class="card" style="text-align:center;padding:60px"><h2>Could not load overview</h2><p style="color:var(--text-secondary)">Make sure the backend is running on port 4500.</p></div>`;
  }
}
