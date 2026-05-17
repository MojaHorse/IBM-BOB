import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderApprovals(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading approvals...</div>`;
  try {
    const res = await axios.get(`${API}/approvals`);
    const approvals = res.data;

    const pending = approvals.filter((a: any) => a.status === "needs_review");
    const acted = approvals.filter((a: any) => a.status !== "needs_review");

    const statusLabel: Record<string, string> = {
      needs_review: "Needs Review",
      approved: "Approved",
      dismissed: "Dismissed",
      pr_created: "PR Created",
      action_prepared: "Action Prepared",
      action_sent: "Action Sent"
    };
    const statusClass: Record<string, string> = {
      needs_review: "warning",
      approved: "healthy",
      dismissed: "",
      pr_created: "healthy",
      action_prepared: "warning",
      action_sent: "healthy"
    };

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Phase 8 · Approval Workflow</p>
        <h1>Approvals</h1>
        <p class="subtitle">BOB requires approval before acting. ${pending.length} action${pending.length !== 1 ? 's' : ''} pending review.</p>
      </section>

      ${pending.length === 0 && acted.length === 0 ? `
        <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent-green)" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <p style="color:var(--text-secondary); font-size:16px; max-width:400px">No pending approvals. When BOB detects risks that require action, approval requests will appear here.</p>
        </div>
      ` : ''}

      <!-- Pending Approvals -->
      ${pending.length > 0 ? `
        <div style="margin-bottom:8px"><p class="label" style="margin:0">Pending Approval (${pending.length})</p></div>
        <div class="grid" style="gap:16px; margin-bottom:32px">
          ${pending.map((a: any) => renderApprovalCard(a, statusLabel, statusClass, true)).join('')}
        </div>
      ` : ''}

      <!-- Past Actions -->
      ${acted.length > 0 ? `
        <div style="margin-bottom:8px"><p class="label" style="margin:0">Completed</p></div>
        <div class="grid" style="gap:12px; opacity:0.7">
          ${acted.map((a: any) => renderApprovalCard(a, statusLabel, statusClass, false)).join('')}
        </div>
      ` : ''}
    `;

    // Wire approve buttons
    container.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        await axios.post(`${API}/approvals/${id}/approve`);
        renderApprovals(container);
      });
    });

    // Wire dismiss buttons
    container.querySelectorAll('.dismiss-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        await axios.post(`${API}/approvals/${id}/dismiss`);
        renderApprovals(container);
      });
    });

    // Wire create-pr buttons
    container.querySelectorAll('.create-pr-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        await axios.post(`${API}/approvals/${id}/approve`);
        await axios.post(`${API}/approvals/${id}/create-pr`);
        renderApprovals(container);
      });
    });

  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load approvals</h2></div>`;
  }
}

function renderApprovalCard(a: any, statusLabel: Record<string, string>, statusClass: Record<string, string>, showActions: boolean): string {
  const typeLabel = a.type === 'docsync' ? 'DocSync Fix' : a.type === 'conflict' ? 'Conflict Action' : 'Action';

  return `
    <div class="card approval-card" style="padding:20px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <div style="display:flex; align-items:center; gap:10px">
          <span class="status-pill ${statusClass[a.status] || ''}">${statusLabel[a.status] || a.status}</span>
          <span class="badge">${typeLabel}</span>
        </div>
        <code style="font-size:11px">${a.repo}</code>
      </div>

      <p style="margin:0 0 8px; font-size:15px"><strong>${a.description}</strong></p>
      <p style="margin:0; color:var(--text-secondary); font-size:13px">
        Team: ${a.team} · File: <code style="font-size:12px; padding:1px 4px">${a.file}</code>
      </p>

      ${a.suggestedBranch ? `
        <p style="margin:8px 0 0; font-size:12px; color:var(--text-secondary)">
          Branch: <code style="font-size:11px; padding:1px 4px">${a.suggestedBranch}</code>
        </p>
      ` : ''}

      ${a.approver ? `
        <p style="margin:8px 0 0; font-size:12px; color:var(--text-secondary)">
          Approved by: <strong style="color:var(--accent-green)">${a.approver}</strong>
          ${a.approvedAt ? ` · ${new Date(a.approvedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
      ` : ''}

      ${a.prUrl ? `
        <p style="margin:8px 0 0; font-size:13px">
          <a href="${a.prUrl}" target="_blank" style="color:var(--accent-blue); text-decoration:none">View PR →</a>
        </p>
      ` : ''}

      <!-- Approval context -->
      ${showActions ? `
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color)">
          <p style="margin:0 0 12px; font-size:11px; color:var(--text-secondary)">
            Approval required because BOB may create a GitHub comment or PR that affects the repo workflow.
          </p>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <button class="btn-primary approve-btn" data-id="${a.id}">Approve Action</button>
            ${a.type === 'docsync' ? `
              <button class="btn-primary create-pr-btn" data-id="${a.id}" style="background:var(--accent-green)">Approve & Create PR</button>
            ` : ''}
            <button class="btn-secondary dismiss-btn" data-id="${a.id}">Dismiss</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
