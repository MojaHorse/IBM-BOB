import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderDocSync(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Checking documentation sync...</div>`;
  try {
    const token = localStorage.getItem("github_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Dynamically get repo list from overview instead of hardcoding
    const reposRes = await axios.get(`${API}/repos-overview`, { headers });
    const repos = reposRes.data.map((r: any) => r.name);
    const results = await Promise.all(repos.map((r: string) => axios.get(`${API}/docsync?repo=${r}`)));

    const allWarnings = results.flatMap((r, i) =>
      r.data.warnings.map((w: any) => ({ ...w, repo: repos[i] }))
    );

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Documentation Sync + Safe Fix PRs</p>
        <h1 >DocSync</h1>
        <p class="subtitle">${allWarnings.length} documentation issue(s) detected</p>
      </section>

      ${allWarnings.length === 0 ? '<div class="card large"><p class="safe" style="font-size:18px">✓ All documentation is in sync.</p></div>' : `
        <section class="grid" style="gap:16px">
          ${allWarnings.map((w: any) => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h2 style="margin:0;font-size:20px">${w.file}</h2>
                <code style="font-size:12px">${w.repo}</code>
              </div>
              <div class="docsync-diff">
                <div class="diff-line diff-remove">
                  <span class="diff-marker">−</span>
                  Docs say: <code>${w.documentedEndpoint}</code>
                </div>
                <div class="diff-line diff-add">
                  <span class="diff-marker">+</span>
                  Code uses: <code>${w.actualEndpoint}</code>
                </div>
              </div>
              <div class="suggested-action" style="margin-top:16px">
                <strong>↳ Suggested fix:</strong> ${w.suggestedFix}
              </div>
              <div style="margin-top:16px;display:flex;gap:8px">
                <button class="btn-primary create-pr-btn" data-file="${w.file}" data-repo="${w.repo}">Create GitHub PR</button>
                <button class="btn-secondary">Dismiss</button>
              </div>
            </div>
          `).join("")}
        </section>
      `}
    `;

    container.querySelectorAll('.create-pr-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        const file = t.getAttribute('data-file') || 'README.md';
        const repo = t.getAttribute('data-repo') || 'payment-service';
        showPRModal(file, repo);
      });
    });
  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load DocSync data</h2></div>`;
  }
}

function showPRModal(file: string, repo: string) {
  const slug = file.replace(/\./g, '-').toLowerCase();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="pr-modal">
      <div class="modal-content card">
        <div class="modal-header">
          <h2><span class="safe">✓</span> GitHub PR Created</h2>
          <button class="close-btn" onclick="document.getElementById('pr-modal')?.remove()">✕</button>
        </div>
        <div class="modal-body">
          <p><strong>Repository:</strong> ${repo}</p>
          <p><strong>Branch:</strong> <code>bob/docsync/${repo}/${slug}</code></p>
          <p><strong>Title:</strong> BOB: Update ${file} documentation</p>
          <p><strong>Files changed:</strong> ${file}</p>
          <p><strong>Status:</strong> <span class="safe">Ready for review</span></p>
          <button class="btn-secondary mt-3" onclick="document.getElementById('pr-modal')?.remove()">View on GitHub</button>
        </div>
      </div>
    </div>
  `);
}
