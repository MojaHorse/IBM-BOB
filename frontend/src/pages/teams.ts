import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderTeams(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading teams...</div>`;
  try {
    const res = await axios.get(`${API}/teams`);
    const teams = res.data;

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Team Management</p>
        <h1>Teams</h1>
        <p class="subtitle">${teams.length} teams in IBM Client Engineering</p>
      </section>

      <section class="grid two-column">
        ${teams.map((t: any) => `
          <div class="card large">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h2 style="margin:0">${t.name}</h2>
              <span class="status-pill warning">${t.repos.length} repo(s)</span>
            </div>
            <p class="label">Team Lead</p>
            <p style="margin:0 0 16px"><strong>${t.lead}</strong></p>
            <p class="label">Members (${t.members.length})</p>
            <div class="member-list">
              ${t.members.map((m: any) => `
                <div class="member-chip">
                  ${m.avatar && m.avatar.startsWith('http')
                    ? `<img src="${m.avatar}" alt="${m.name}" class="avatar-sm" style="border-radius:50%;width:32px;height:32px;object-fit:cover" />`
                    : `<div class="avatar-sm">${m.avatar || m.name.substring(0, 2).toUpperCase()}</div>`
                  }
                  <span>${m.name}</span>
                  <span class="role-tag">${m.role}</span>
                  ${m.contributions ? `<span class="badge" style="font-size:10px">${m.contributions} commits</span>` : ''}
                </div>
              `).join("")}
            </div>
            <p class="label" style="margin-top:16px">Owned Repositories</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${t.repos.map((r: string) => `<code>${r}</code>`).join("")}
            </div>
            <p class="label" style="margin-top:16px">Alert Channel</p>
            <p style="margin:0;color:var(--accent-blue)">Slack: ${t.alertChannel}</p>
          </div>
        `).join("")}
      </section>
    `;
  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load teams</h2></div>`;
  }
}
