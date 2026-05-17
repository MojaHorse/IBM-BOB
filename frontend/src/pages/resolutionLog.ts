import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

interface LogEntry {
  id: string;
  timestamp: string;
  phase: string;
  event: string;
  details: string;
  status: string;
  repo?: string;
  parties?: string[];
}

export async function renderResolutionLog(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading resolution log...</div>`;

  try {
    const res = await axios.get(`${API}/resolution-log`);
    const entries: LogEntry[] = res.data;

    const statusConfig: Record<string, { label: string; cls: string; icon: string }> = {
      detected:     { label: "Detected",       cls: "warning",  icon: "🔍" },
      acknowledged: { label: "Acknowledged",   cls: "",         icon: "👁" },
      coordinating: { label: "In Coordination",cls: "warning",  icon: "🤝" },
      approval_pending: { label: "Approval Pending", cls: "warning", icon: "⏳" },
      approved:     { label: "Approved",        cls: "healthy",  icon: "✓" },
      action_sent:  { label: "Action Sent",     cls: "healthy",  icon: "📤" },
      resolved:     { label: "Resolved",        cls: "healthy",  icon: "✅" },
      dismissed:    { label: "Dismissed",       cls: "",         icon: "✕" },
    };

    const active = entries.filter(e => !['resolved', 'dismissed'].includes(e.status));
    const closed = entries.filter(e => ['resolved', 'dismissed'].includes(e.status));

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Phase 10 · Resolution Tracking</p>
        <h1 >Resolution Log</h1>
        <p class="subtitle">${active.length} active risk${active.length !== 1 ? 's' : ''} being tracked · ${closed.length} resolved</p>
      </section>

      ${entries.length === 0 ? `
        <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p style="color:var(--text-secondary); font-size:16px; max-width:400px">No activity yet. When BOB detects risks and actions are taken, the full timeline will appear here.</p>
        </div>
      ` : `
        <!-- Active Risks -->
        ${active.length > 0 ? `
          <div style="margin-bottom:8px"><p class="label" style="margin:0">Active Risks</p></div>
          <div class="grid" style="gap:1px; margin-bottom:32px; background:var(--bg-base); border-radius:12px; overflow:hidden; border:1px solid var(--border-color)">
            ${active.map(entry => renderLogRow(entry, statusConfig)).join('')}
          </div>
        ` : ''}

        <!-- Resolved / Dismissed -->
        ${closed.length > 0 ? `
          <div style="margin-bottom:8px"><p class="label" style="margin:0">Resolved</p></div>
          <div class="grid" style="gap:1px; background:var(--bg-base); border-radius:12px; overflow:hidden; border:1px solid var(--border-color); opacity:0.7">
            ${closed.map(entry => renderLogRow(entry, statusConfig)).join('')}
          </div>
        ` : ''}
      `}
    `;
  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load resolution log</h2></div>`;
  }
}

function renderLogRow(entry: LogEntry, config: Record<string, any>): string {
  const cfg = config[entry.status] || { label: entry.status, cls: '', icon: '·' };
  const time = new Date(entry.timestamp);
  const timeStr = time.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `
    <div class="log-row" style="display:flex; align-items:center; gap:16px; padding:16px 20px; background:var(--bg-base)">
      <div style="width:28px; text-align:center; font-size:16px">${cfg.icon}</div>
      <div style="flex:1; min-width:0">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
          <strong style="font-size:14px">${entry.event}</strong>
          <span class="status-pill ${cfg.cls}" style="font-size:10px; padding:2px 8px">${cfg.label}</span>
        </div>
        <p style="margin:0; font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${entry.details}</p>
        ${entry.parties && entry.parties.length > 0 ? `
          <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap">
            ${entry.parties.map(p => `<span style="font-size:10px; padding:2px 8px; background:rgba(56,189,248,0.08); border-radius:4px; color:var(--accent-blue)">${p}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div style="text-align:right; white-space:nowrap">
        <span style="font-size:11px; color:var(--text-secondary)">${timeStr}</span>
        ${entry.repo ? `<br><code style="font-size:10px; padding:1px 4px">${entry.repo}</code>` : ''}
      </div>
    </div>
  `;
}
