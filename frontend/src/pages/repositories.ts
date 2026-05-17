import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderRepositories(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading repositories...</div>`;
  try {
    const token = localStorage.getItem("github_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const activeRepo = localStorage.getItem("bob-active-repo");

    const res = await axios.get(`${API}/repos-overview`, { headers });
    const repos = res.data;

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Repository Management</p>
        <h1>Repositories</h1>
        <p class="subtitle">${repos.length} repositories linked via GitHub${activeRepo ? ` · Viewing <strong>${activeRepo}</strong>` : ''}</p>
      </section>

      <section class="grid" style="gap:16px">
        ${repos.map((r: any) => `
          <div class="card repo-row repo-selectable ${r.name === activeRepo ? 'repo-active' : ''}" data-repo="${r.name}" style="cursor:pointer">
            <div class="repo-row-main">
              <div>
                <div style="display:flex;align-items:center;gap:8px">
                  <h2 style="margin:0 0 4px;font-size:22px">${r.name}</h2>
                  ${r.name === activeRepo ? '<span class="status-pill healthy" style="font-size:10px;padding:2px 8px">Active</span>' : ''}
                </div>
                <div style="margin-top: 8px">
                  ${r.name === activeRepo ? `
                    <button class="btn-primary scan-btn" data-repo="${r.name}" style="padding: 6px 12px; font-size: 12px; margin-top: 4px;">🔍 Scan & Analyze</button>
                  ` : ''}
                </div>
                <p style="margin:0;color:var(--text-secondary);font-size:14px">${r.team} · Default branch: ${r.defaultBranch}</p>
              </div>
              <div style="display:flex;align-items:center;gap:16px">
                <span class="status-pill ${r.status.toLowerCase()}">${r.status}</span>
                <span class="badge">GitHub</span>
                <span class="badge">Scanned: ${r.lastScanned}</span>
              </div>
            </div>
            <div class="repo-row-stats">
              <div><span class="label">Open PRs</span><strong>${r.openPRs}</strong></div>
              <div><span class="label">Conflicts</span><strong class="${r.conflictRisks > 0 ? 'warning' : 'safe'}">${r.conflictRisks}</strong></div>
              <div><span class="label">DocSync</span><strong class="${r.docSyncWarnings > 0 ? 'warning' : 'safe'}">${r.docSyncWarnings}</strong></div>
              <div><span class="label">Stale Branches</span><strong>${r.outdatedBranches}</strong></div>
              <div>
                <span class="label">Risk Score</span>
                <strong><span class="risk-bar"><span class="risk-fill" style="width:${r.riskScore}%;background:${r.riskScore >= 50 ? 'var(--accent-red)' : r.riskScore >= 20 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></span></span> ${r.riskScore}/100</strong>
              </div>
            </div>
          </div>
        `).join("")}
      </section>
    `;

    // Wire repo selection
    container.querySelectorAll('.repo-selectable').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent clicking if they clicked the scan button
        if ((e.target as HTMLElement).closest('.scan-btn')) return;
        
        const repoName = (card as HTMLElement).getAttribute('data-repo');
        if (repoName) {
          window.dispatchEvent(new CustomEvent('bob-set-repo', { detail: repoName }));
          renderRepositories(container); // Re-render to show active state
        }
      });
    });

    // Wire scan buttons
    container.querySelectorAll('.scan-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const repoName = (btn as HTMLElement).getAttribute('data-repo');
        const token = localStorage.getItem("github_token");
        
        if (repoName && token) {
          const button = btn as HTMLButtonElement;
          button.disabled = true;
          button.innerHTML = '⏳ Scanning... (Takes ~5s)';
          
          try {
            await axios.post(`${API}/github/scan`, { repo: repoName }, { headers: { Authorization: `Bearer ${token}` } });
            window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'conflict-radar' }));
          } catch (error) {
            console.error('Scan failed:', error);
            button.innerHTML = '❌ Scan Failed';
            setTimeout(() => {
              button.innerHTML = '🔍 Scan & Analyze';
              button.disabled = false;
            }, 2000);
          }
        }
      });
    });
  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load repositories</h2></div>`;
  }
}
