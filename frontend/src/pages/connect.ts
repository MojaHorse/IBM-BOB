import axios from "axios";

const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  html_url: string;
  description: string;
  updated_at: string;
}

export async function renderConnect(container: HTMLElement, onScanComplete: (data: any) => void) {
  const token = localStorage.getItem("github_token");

  if (!token) {
    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Onboarding</p>
        <h1>Control Room Setup</h1>
        <p class="subtitle">Connect BOB to your repository provider to begin monitoring for coordination risks.</p>
      </section>

      <div class="card large" style="max-width:600px;text-align:center;padding:60px 40px">
        <div class="avatar" style="background:var(--bg-base);width:80px;height:80px;margin:0 auto 24px">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </div>
        <h2 style="margin-bottom:16px">Connect with GitHub</h2>
        <p style="color:var(--text-secondary);margin-bottom:32px">BOB needs read access to your repositories and pull requests to analyze coordination risks.</p>
        <button id="github-connect-btn" class="btn-primary" style="padding:16px 32px;font-size:18px">Authorize BOB on GitHub</button>
      </div>
    `;

    document.getElementById('github-connect-btn')?.addEventListener('click', () => {
      window.location.href = `${API}/auth/github`;
    });
    return;
  }

  // If token exists, show the repository selection flow
  container.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Onboarding</p>
      <h1>Select Repository</h1>
      <p class="subtitle">Connected to GitHub. Select a repository from your account or enter a custom path.</p>
    </section>

    <div class="grid" style="grid-template-columns: 2fr 1fr; gap:32px; align-items: start;">
      <div id="repo-selection-area">
        <div class="toolbar" style="grid-template-columns: 1fr; margin-bottom: 16px;">
          <div class="repo-picker">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-secondary)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="repo-search" placeholder="Search your repositories..." style="width:100%; padding: 12px 12px 12px 40px; background:var(--bg-surface); border:1px solid var(--border-strong); border-radius:8px; color:var(--text-primary); font-family:inherit; font-size:14px; outline:none;">
          </div>
        </div>

        <div id="repo-list" class="grid" style="grid-template-columns: 1fr; gap: 12px; max-height: 500px; overflow-y: auto; padding-right: 8px;">
          <div class="loading-state">Fetching repositories...</div>
        </div>
        
        <div style="margin-top:24px; text-align:center">
          <p style="color:var(--text-secondary); font-size:13px">Don't see your repo? <a href="#" id="show-manual-form" style="color:var(--accent-blue)">Enter manual path</a></p>
        </div>

        <div id="manual-form-area" style="display:none; margin-top:24px" class="card">
          <h3 style="margin-bottom:16px">Manual Repository Path</h3>
          <form id="connect-form">
            <div style="display:flex; gap:12px; margin-bottom:12px">
              <input type="text" id="owner" name="owner" placeholder="Owner (e.g. facebook)" required style="flex:1; padding:12px; background:var(--bg-base); border:1px solid var(--border-strong); border-radius:8px; color:var(--text-primary); font-family:inherit;">
              <input type="text" id="repo" name="repo" placeholder="Repo (e.g. react)" required style="flex:1; padding:12px; background:var(--bg-base); border:1px solid var(--border-strong); border-radius:8px; color:var(--text-primary); font-family:inherit;">
            </div>
            <button type="submit" class="btn-primary" style="width:100%; padding:12px">Scan Custom Path</button>
          </form>
        </div>
      </div>

      <aside>
        <div class="card" style="margin-bottom: 24px;">
          <div style="display:flex; align-items:center; gap:10px; color:var(--accent-green); margin-bottom:16px">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <strong style="font-size:14px">GitHub Linked</strong>
          </div>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.5">
            BOB is now authorized to read your repositories. Selected repositories will be analyzed for cross-PR coordination risks.
          </p>
          <button id="disconnect-btn" class="btn-secondary" style="width:100%; margin-top:16px; font-size:12px; padding:8px">Disconnect Account</button>
        </div>

        <div id="scan-status" style="display:none">
          <div class="card" style="border-color:var(--accent-blue)">
            <div class="loading-state" style="padding:10px">
              <div class="spinner" style="width:30px; height:30px"></div>
              <p style="font-size:14px; margin-top:12px">Scanning Repository...</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;

  const repoList = document.getElementById('repo-list')!;
  const repoSearch = document.getElementById('repo-search') as HTMLInputElement;
  const showManualBtn = document.getElementById('show-manual-form');
  const manualArea = document.getElementById('manual-form-area');
  const manualForm = document.getElementById('connect-form') as HTMLFormElement;
  const status = document.getElementById('scan-status') as HTMLElement;
  const disconnectBtn = document.getElementById('disconnect-btn');

  let allRepos: GithubRepo[] = [];

  const performScan = async (owner: string, repo: string) => {
    status.style.display = 'block';
    document.getElementById('repo-selection-area')!.style.opacity = '0.5';
    document.getElementById('repo-selection-area')!.style.pointerEvents = 'none';

    try {
      const res = await axios.post(`${API}/github/scan`, { repo: `${owner}/${repo}` }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onScanComplete(res.data);
    } catch (err: any) {
      status.innerHTML = `
        <div class="alert alert-high">
          <strong>Scan Failed</strong>
          <p>${err.response?.data?.error || err.message}</p>
          <button class="btn-secondary" style="margin-top:12px" onclick="location.reload()">Try Again</button>
        </div>
      `;
    }
  };

  const renderRepoItems = (repos: GithubRepo[]) => {
    if (repos.length === 0) {
      repoList.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary)">No repositories found</div>`;
      return;
    }

    repoList.innerHTML = repos.map(r => `
      <div class="card repo-item" data-owner="${r.owner}" data-repo="${r.name}" style="cursor:pointer; transition: all 0.2s ease; padding:16px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:16px">
          <div class="avatar" style="background:var(--bg-base); width:36px; height:36px; font-size:12px">
            ${r.private ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3L15.5 7.5z"/></svg>'}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px">
              <strong style="font-size:15px">${r.name}</strong>
              <span class="status-pill ${r.private ? '' : 'healthy'}" style="font-size:10px; padding:2px 6px">${r.private ? 'Private' : 'Public'}</span>
            </div>
            <p style="margin:4px 0 0; font-size:12px; color:var(--text-secondary); max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${r.description || 'No description'}</p>
          </div>
        </div>
        <div style="text-align:right">
          <a href="${r.html_url}" target="_blank" class="external-link" style="color:var(--text-secondary); margin-right:12px" onclick="event.stopPropagation()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <button class="btn-primary select-repo-btn" style="padding:6px 12px; font-size:12px">Scan</button>
        </div>
      </div>
    `).join("");

    repoList.querySelectorAll('.repo-item').forEach(item => {
      item.addEventListener('click', () => {
        const owner = item.getAttribute('data-owner')!;
        const repo = item.getAttribute('data-repo')!;
        performScan(owner, repo);
      });
    });
  };

  // Initial Fetch
  try {
    const res = await axios.get(`${API}/github/user/repos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    allRepos = res.data;
    renderRepoItems(allRepos);
  } catch (err: any) {
    repoList.innerHTML = `<div class="alert alert-high">Failed to load repositories: ${err.message}</div>`;
  }

  // Search Logic
  repoSearch.addEventListener('input', (e) => {
    const term = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = allRepos.filter(r => 
      r.name.toLowerCase().includes(term) || 
      r.full_name.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term))
    );
    renderRepoItems(filtered);
  });

  // Manual Form Logic
  showManualBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    manualArea!.style.display = manualArea!.style.display === 'none' ? 'block' : 'none';
  });

  manualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(manualForm);
    performScan(formData.get('owner') as string, formData.get('repo') as string);
  });

  disconnectBtn?.addEventListener('click', async () => {
    try { await axios.post(`${API}/disconnect`); } catch {}
    localStorage.removeItem("github_token");
    localStorage.removeItem("bob-active-repo");
    const repoIndicator = document.getElementById('sidebar-active-repo');
    if (repoIndicator) repoIndicator.style.display = 'none';
    renderConnect(container, onScanComplete);
  });
}
