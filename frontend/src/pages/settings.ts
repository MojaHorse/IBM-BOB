import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export function renderSettings(container: HTMLElement) {
  const token = localStorage.getItem("github_token");
  const isConnected = !!token;

  container.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Configuration</p>
      <h1>Settings</h1>
      <p class="subtitle">Manage your organization, integrations, and notification preferences</p>
    </section>

    <section class="grid two-column" style="margin-bottom:20px">
      <div class="card">
        <h2 style="font-size:18px;margin-bottom:16px">Organization</h2>
        <div class="settings-row"><span class="label" style="margin:0">Name</span><strong>IBM Client Engineering</strong></div>
        <div class="settings-row"><span class="label" style="margin:0">Plan</span><strong>Hackathon Demo</strong></div>
        <div class="settings-row"><span class="label" style="margin:0">Owner</span><strong>Team Lead</strong></div>
        <div class="settings-row"><span class="label" style="margin:0">Created</span><strong>April 15, 2026</strong></div>
      </div>

      <div class="card">
        <h2 style="font-size:18px;margin-bottom:16px">Integrations</h2>
        <div class="integration-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color)">
          <div style="display:flex;align-items:center;gap:12px">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            <div>
              <strong style="display:block;font-size:14px">GitHub</strong>
              <span style="font-size:12px;color:var(--text-tertiary)">${isConnected ? 'ibm-client-engineering' : 'Not linked'}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="status-pill ${isConnected ? 'healthy' : ''}" style="${!isConnected ? 'background:var(--bg-base);color:var(--text-tertiary)' : ''}">${isConnected ? 'Connected' : 'Disconnected'}</span>
            <button class="btn-secondary" id="github-toggle-btn" style="padding:5px 12px;font-size:12px">${isConnected ? 'Disconnect' : 'Connect'}</button>
          </div>
        </div>
        <div class="integration-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color)">
          <div style="display:flex;align-items:center;gap:12px">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <div>
              <strong style="display:block;font-size:14px">Slack</strong>
              <span style="font-size:12px;color:var(--text-tertiary)">IBM CE Workspace</span>
            </div>
          </div>
          <span class="status-pill healthy">Connected</span>
        </div>
        <div class="integration-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
          <div style="display:flex;align-items:center;gap:12px">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            <div>
              <strong style="display:block;font-size:14px">VS Code Extension</strong>
              <span style="font-size:12px;color:var(--text-tertiary)">Coming in V2</span>
            </div>
          </div>
          <span class="status-pill" style="background:var(--bg-base);color:var(--text-tertiary)">Not connected</span>
        </div>
      </div>
    </section>

    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0;font-size:18px">Role-Based Access Control</h2>
        <span class="badge">5 roles</span>
      </div>
      <p style="color:var(--text-secondary);margin-bottom:16px;font-size:14px">Manage who can do what in your organization.</p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Role</th><th>Manage Org</th><th>Add Repos</th><th>Create Teams</th><th>Approve Actions</th><th>View Dashboard</th></tr></thead>
          <tbody>
            <tr><td><strong>Owner</strong></td><td class="safe">✓</td><td class="safe">✓</td><td class="safe">✓</td><td class="safe">✓</td><td class="safe">✓</td></tr>
            <tr><td><strong>Admin</strong></td><td>—</td><td class="safe">✓</td><td class="safe">✓</td><td class="safe">✓</td><td class="safe">✓</td></tr>
            <tr><td><strong>Team Lead</strong></td><td>—</td><td>—</td><td>—</td><td class="safe">✓</td><td class="safe">✓</td></tr>
            <tr><td><strong>Developer</strong></td><td>—</td><td>—</td><td>—</td><td>—</td><td class="safe">✓</td></tr>
            <tr><td><strong>Viewer</strong></td><td>—</td><td>—</td><td>—</td><td>—</td><td class="safe">✓</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // Wire GitHub connect/disconnect
  document.getElementById('github-toggle-btn')?.addEventListener('click', async () => {
    if (isConnected) {
      if (confirm('Disconnect your GitHub account? BOB will lose access to your repositories.')) {
        try { await axios.post(`${API}/disconnect`); } catch {}
        localStorage.removeItem('github_token');
        localStorage.removeItem('bob-active-repo');
        renderSettings(container);
        // Update the header badge too
        const badge = document.getElementById('connection-badge');
        if (badge) {
          badge.innerHTML = '⏳ Connect GitHub';
          badge.classList.remove('badge-connected');
        }
        // Hide sidebar active repo indicator
        const repoIndicator = document.getElementById('sidebar-active-repo');
        if (repoIndicator) repoIndicator.style.display = 'none';
      }
    } else {
      window.location.href = `${API}/auth/github`;
    }
  });
}
