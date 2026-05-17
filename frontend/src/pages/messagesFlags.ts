import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderMessagesFlags(container: HTMLElement) {
  container.innerHTML = `<div class="loading-state">Loading messages & flags...</div>`;
  try {
    const [alertsRes, scanRes, approvalsRes] = await Promise.all([
      axios.get(`${API}/alerts`),
      axios.get(`${API}/github/last-scan`),
      axios.get(`${API}/approvals`)
    ]);

    const alerts = alertsRes.data;
    const scan = scanRes.data;
    const approvals = approvalsRes.data;
    const conflicts = scan?.conflicts || [];
    const unread = alerts.filter((a: any) => !a.read).length;

    // Build flag summary from conflicts
    const allPrFlags: string[] = [];
    const allFileFlags: string[] = [];
    const allRepoFlags: string[] = [];
    conflicts.forEach((c: any) => {
      if (c.flags) {
        allPrFlags.push(...(c.flags.pr || []));
        allFileFlags.push(...(c.flags.file || []));
        allRepoFlags.push(...(c.flags.repo || []));
      }
    });
    const uniquePrFlags = [...new Set(allPrFlags)];
    const uniqueFileFlags = [...new Set(allFileFlags)];
    const uniqueRepoFlags = [...new Set(allRepoFlags)];

    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Phase 6.5 · Localized Messaging & Flagging</p>
        <h1 >Messages & Flags</h1>
        <p class="subtitle">${unread} unread alert(s) · ${conflicts.length} active risk(s) · ${approvals.filter((a: any) => a.status === 'needs_review').length} pending approval(s)</p>
      </section>

      <!-- Active Flags Summary -->
      <section class="card large" style="margin-bottom:24px">
        <h2 style="margin-bottom:16px">Active Flags</h2>
        <div class="grid" style="grid-template-columns:repeat(3, 1fr); gap:16px">
          <div>
            <p class="label" style="margin-bottom:8px">PR Flags</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px">
              ${uniquePrFlags.length === 0 ? '<span style="color:var(--text-secondary); font-size:13px">No active flags</span>' :
                uniquePrFlags.map(f => `<span class="flag-pill flag-pr">${f}</span>`).join('')}
            </div>
          </div>
          <div>
            <p class="label" style="margin-bottom:8px">File Flags</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px">
              ${uniqueFileFlags.length === 0 ? '<span style="color:var(--text-secondary); font-size:13px">No active flags</span>' :
                uniqueFileFlags.map(f => `<span class="flag-pill flag-file">${f}</span>`).join('')}
            </div>
          </div>
          <div>
            <p class="label" style="margin-bottom:8px">Repo Flags</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px">
              ${uniqueRepoFlags.length === 0 ? '<span style="color:var(--text-secondary); font-size:13px">No active flags</span>' :
                uniqueRepoFlags.map(f => `<span class="flag-pill flag-repo">${f}</span>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- Localized Messages from Conflicts -->
      ${conflicts.length > 0 ? `
        <section style="margin-bottom:24px">
          <h2 style="margin-bottom:16px">Localized Risk Messages</h2>
          <div class="grid" style="gap:16px">
            ${conflicts.map((c: any, idx: number) => renderLocalizedMessageCard(c, idx)).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Alert Feed -->
      <section>
        <h2 style="margin-bottom:16px">Alert Feed <span class="count-badge">${unread} new</span></h2>
        <div class="grid" style="gap:12px">
          ${alerts.map((a: any) => `
            <div class="card alert-row ${!a.read ? 'alert-unread' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="display:flex;gap:12px;align-items:flex-start">
                  <div class="alert-severity-dot ${a.severity}"></div>
                  <div>
                    <strong style="display:block;margin-bottom:4px">${a.title}</strong>
                    <p style="margin:0 0 8px;color:var(--text-secondary);line-height:1.5">${a.message}</p>
                    <div style="display:flex;gap:12px;font-size:12px;color:var(--text-secondary)">
                      <span>${a.repo || ''}</span>
                      <span>·</span>
                      <span>${a.team || ''}</span>
                      <span>·</span>
                      <span>${a.channel}</span>
                      <span>·</span>
                      <span>${a.time}</span>
                    </div>
                  </div>
                </div>
                <span class="badge" style="white-space:nowrap">${a.read ? 'Read' : 'New'}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  } catch {
    container.innerHTML = `<div class="card large"><h2>Could not load messages & flags</h2><p>Make sure the backend is running and a repo has been scanned.</p></div>`;
  }
}

function renderLocalizedMessageCard(c: any, idx: number): string {
  const riskColor = c.riskLevel === 'High' ? 'critical' : (c.riskLevel === 'Medium' ? 'warning' : 'healthy');
  const msgs = c.localizedMessages || {};
  const flags = c.flags || {};

  return `
    <div class="card" style="padding:0; overflow:hidden; ${c.riskLevel === 'High' ? 'border-color:rgba(239,68,68,0.3);' : ''}">
      <!-- Header -->
      <div style="padding:16px 20px; background:var(--bg-base); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color)">
        <div style="display:flex; align-items:center; gap:10px">
          <span class="status-pill ${riskColor}" style="font-size:12px">${c.riskLevel} Risk · ${c.score}/100</span>
          <span style="font-size:12px; color:var(--text-secondary)">Risk #${idx + 1}</span>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap">
          ${(flags.pr || []).map((f: string) => `<span class="flag-pill flag-pr">${f}</span>`).join('')}
        </div>
      </div>

      <div style="padding:20px">
        <!-- File flags -->
        <div style="display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap">
          ${c.overlappingFiles.map((f: string) => `<code style="background:rgba(250,204,21,0.1); color:var(--accent-yellow); border:none; font-size:12px">${f}</code>`).join('')}
          ${(flags.file || []).map((f: string) => `<span class="flag-pill flag-file" style="font-size:10px">${f}</span>`).join('')}
        </div>

        <!-- Localized Messages -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px">
          <div class="msg-card msg-developer">
            <div class="msg-header">
              <span class="msg-icon">👤</span>
              <span class="msg-recipient">To ${c.parties.authorA.name}</span>
              <span class="msg-tag">Developer</span>
            </div>
            <p class="msg-body">${(msgs.authorA || '').split('\\n')[0]}</p>
          </div>
          <div class="msg-card msg-developer">
            <div class="msg-header">
              <span class="msg-icon">👤</span>
              <span class="msg-recipient">To ${c.parties.authorB.name}</span>
              <span class="msg-tag">Developer</span>
            </div>
            <p class="msg-body">${(msgs.authorB || '').split('\\n')[0]}</p>
          </div>
          <div class="msg-card msg-reviewer">
            <div class="msg-header">
              <span class="msg-icon">👁</span>
              <span class="msg-recipient">To ${c.parties.reviewer}</span>
              <span class="msg-tag">Reviewer</span>
            </div>
            <p class="msg-body">${(msgs.reviewer || '').split('\\n')[0]}</p>
          </div>
          <div class="msg-card msg-lead">
            <div class="msg-header">
              <span class="msg-icon">🛡</span>
              <span class="msg-recipient">To ${c.parties.approver}</span>
              <span class="msg-tag">Team Lead</span>
            </div>
            <p class="msg-body">${(msgs.teamLead || '').split('\\n')[0]}</p>
          </div>
        </div>

        <!-- GitHub Comment Preview -->
        ${c.githubCommentPreview ? `
          <div style="margin-bottom:16px">
            <p class="label" style="margin-bottom:8px; font-size:10px">GitHub Comment Preview · Requires Approval</p>
            <div class="github-preview">
              <div class="github-preview-header">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
                <span>PR Comment Preview</span>
                <span class="flag-pill flag-pr" style="font-size:9px; margin-left:auto">Approval Required</span>
              </div>
              <pre class="github-preview-body">${c.githubCommentPreview.replace(/\\n/g, '\n')}</pre>
            </div>
          </div>
        ` : ''}

        <!-- Action footer -->
        <div style="padding-top:16px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center">
          <div style="display:flex; gap:6px">
            ${(flags.action || []).map((f: string) => `<span class="flag-pill flag-action">${f}</span>`).join('')}
          </div>
          <div style="display:flex; gap:8px">
            <button class="btn-primary" style="padding:8px 16px; font-size:13px" onclick="window.dispatchEvent(new CustomEvent('bob-navigate', {detail:'approvals'}))">Review in Approvals</button>
            <button class="btn-secondary" style="padding:8px 12px; font-size:12px">Acknowledge</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
