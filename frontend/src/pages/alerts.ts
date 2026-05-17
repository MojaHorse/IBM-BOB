import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderAlerts(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading alerts...</div>`;
  try {
    const res = await axios.get(`${API}/alerts`);
    const alerts = res.data;
    const unread = alerts.filter((a: any) => !a.read).length;

    container.innerHTML = `
      <section class="hero" style="margin-bottom:24px">
        <p class="eyebrow">Notifications</p>
        <h1 >Alerts</h1>
        <p class="subtitle">${unread} unread alert(s) across all repositories</p>
      </section>

      <section class="grid" style="gap:12px">
        ${alerts.map((a: any) => `
          <div class="card alert-row ${!a.read ? 'alert-unread' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div style="display:flex;gap:12px;align-items:flex-start">
                <div class="alert-severity-dot ${a.severity}"></div>
                <div>
                  <strong style="display:block;margin-bottom:4px">${a.title}</strong>
                  <p style="margin:0 0 8px;color:#cbd5e1;line-height:1.5">${a.message}</p>
                  <div style="display:flex;gap:12px;font-size:12px;color:var(--text-secondary)">
                    <span>${a.repo}</span>
                    <span>·</span>
                    <span>${a.team}</span>
                    <span>·</span>
                    <span>${a.channel}</span>
                  </div>
                </div>
              </div>
              <span class="badge" style="white-space:nowrap">${a.read ? 'Read' : 'New'}</span>
            </div>
          </div>
        `).join("")}
      </section>
    `;
  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load alerts</h2></div>`;
  }
}
