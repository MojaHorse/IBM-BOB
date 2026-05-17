import "./style.css";
import { renderOverview } from "./pages/overview";
import { renderTeams } from "./pages/teams";
import { renderRepositories } from "./pages/repositories";
import { renderRepoActivity } from "./pages/repoActivity";
import { renderConflictRadar } from "./pages/conflictRadar";
import { renderSimulations } from "./pages/simulations";
import { renderDocSync } from "./pages/docSync";
import { renderApprovals } from "./pages/approvals";
import { renderMessagesFlags } from "./pages/messagesFlags";
import { renderResolutionLog } from "./pages/resolutionLog";
import { renderSettings } from "./pages/settings";

type Page = "overview" | "teams" | "repositories" | "repo-activity" | "conflict-radar" | "simulations" | "messages-flags" | "docsync" | "approvals" | "resolution-log" | "settings";

let currentPage: Page = "overview";

const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

const sidebarItems: { id: Page; label: string; icon: string; section?: string }[] = [
  { id: "overview", label: "Overview", section: "MONITOR", icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
  { id: "teams", label: "Teams", icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { id: "repositories", label: "Repositories", icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' },
  { id: "conflict-radar", label: "Conflict Radar", section: "DETECT", icon: '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/>' },
  { id: "simulations", label: "Simulations", section: "PREDICT", icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>' },
  { id: "messages-flags", label: "Messages & Flags", icon: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
  { id: "docsync", label: "DocSync", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' },
  { id: "approvals", label: "Approvals", section: "ACT", icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
  { id: "resolution-log", label: "Resolution Log", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { id: "settings", label: "Settings", section: " ", icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
];

function renderShell() {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  // Build sidebar nav with section headers
  let sidebarNavHTML = '';
  let lastSection = '';
  for (const item of sidebarItems) {
    if (item.section && item.section !== lastSection) {
      sidebarNavHTML += `<div class="sidebar-section-label">${item.section}</div>`;
      lastSection = item.section;
    }
    sidebarNavHTML += `
      <a href="#" data-page="${item.id}" class="${item.id === currentPage ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
        ${item.label}
      </a>
    `;
    // Insert active repo indicator right after the Repositories nav item
    if (item.id === 'repositories') {
      const activeRepo = localStorage.getItem('bob-active-repo');
      sidebarNavHTML += `
        <div class="active-repo-indicator" id="sidebar-active-repo" ${!activeRepo ? 'style="display:none"' : ''}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span id="sidebar-repo-name">${activeRepo || 'None selected'}</span>
          <button class="repo-clear-btn" id="clear-active-repo" title="Clear selection">×</button>
        </div>
      `;
    }
  }

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">BOB</div>
          <span class="org-name">Repo Control Room</span>
        </div>
        <nav class="sidebar-nav">
          ${sidebarNavHTML}
        </nav>
        <div class="sidebar-footer">
          <button id="theme-toggle" class="theme-toggle-btn">
            <svg id="theme-icon-light" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg id="theme-icon-dark" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <span id="theme-label">Dark Mode</span>
          </button>
          <div class="user-profile" style="margin-top:12px">
            <div class="avatar">TL</div>
            <div>
              <strong>Team Lead</strong>
              <span>Admin</span>
            </div>
          </div>
        </div>
      </aside>

      <main class="content-area">
        <header class="top-nav">
          <div class="breadcrumbs">
            <span>IBM Client Engineering</span>
            <span class="sep">/</span>
            <strong id="breadcrumb-page">${sidebarItems.find(s => s.id === currentPage)?.label}</strong>
            <span class="breadcrumb-repo" id="breadcrumb-repo" style="display:${localStorage.getItem('bob-active-repo') ? 'inline' : 'none'}">
              <span class="sep">/</span>
              <span id="breadcrumb-repo-name">${localStorage.getItem('bob-active-repo') || ''}</span>
            </span>
          </div>
          <div class="repo-metadata" id="top-nav-status">
            <button class="badge" id="connection-badge" style="cursor:pointer;border:none;font-family:inherit">⏳ Not Connected</button>
          </div>
        </header>
        <div class="page-content" id="page-content">
          <div class="loading-state">Loading...</div>
        </div>
      </main>
    </div>
  `;

  updateConnectionBadge();

  // Wire sidebar navigation
  app.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = (e.currentTarget as HTMLElement).getAttribute('data-page') as Page;
      navigateTo(page);
    });
  });

  // Wire theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('bob-theme', next);
    updateThemeButton(next);
  });

  // Wire clear active repo button
  document.getElementById('clear-active-repo')?.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.removeItem('bob-active-repo');
    updateActiveRepoUI();
  });

  loadPage();
}

function updateConnectionBadge() {
  const badge = document.getElementById('connection-badge');
  const token = localStorage.getItem("github_token");
  if (badge) {
    if (token) {
      badge.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> GitHub Connected`;
      badge.classList.add('badge-connected');
      badge.setAttribute('title', 'Click to disconnect');
    } else {
      badge.innerHTML = '⏳ Connect GitHub';
      badge.classList.remove('badge-connected');
      badge.setAttribute('title', 'Click to connect');
    }
    badge.onclick = () => {
      if (token) {
        if (confirm('Disconnect GitHub account?')) {
          fetch(`${API}/disconnect`, { method: 'POST' }).catch(() => {});
          localStorage.removeItem('github_token');
          localStorage.removeItem('bob-active-repo');
          updateConnectionBadge();
          // Update sidebar active repo indicator
          const repoIndicator = document.getElementById('sidebar-active-repo');
          if (repoIndicator) repoIndicator.style.display = 'none';
          loadPage();
        }
      } else {
        window.location.href = `${API}/auth/github`;
      }
    };
  }
}

function navigateTo(page: Page) {
  currentPage = page;

  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-page') === page);
  });

  const bc = document.getElementById('breadcrumb-page');
  if (bc) bc.textContent = sidebarItems.find(s => s.id === page)?.label || '';

  updateConnectionBadge();
  loadPage();
}

function loadPage() {
  const container = document.getElementById('page-content');
  if (!container) return;
  container.scrollTop = 0;

  const pageMap: Record<Page, (c: HTMLElement, ...args: any[]) => void | Promise<void>> = {
    "overview": renderOverview,
    "teams": renderTeams,
    "repositories": renderRepositories,
    "repo-activity": renderRepoActivity,
    "conflict-radar": renderConflictRadar,
    "simulations": renderSimulations,
    "docsync": renderDocSync,
    "approvals": renderApprovals,
    "messages-flags": renderMessagesFlags,
    "resolution-log": renderResolutionLog,
    "settings": renderSettings,
  };

  pageMap[currentPage](container);
}

// Boot
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
if (token) {
  localStorage.setItem("github_token", token);
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Listen for custom navigation events from child pages
window.addEventListener('bob-navigate', (e: any) => {
  navigateTo(e.detail);
});

// Listen for active repo changes from child pages
window.addEventListener('bob-set-repo', (e: any) => {
  localStorage.setItem('bob-active-repo', e.detail);
  updateActiveRepoUI();
});

function updateActiveRepoUI() {
  const activeRepo = localStorage.getItem('bob-active-repo');
  
  // Update sidebar indicator
  const sidebarIndicator = document.getElementById('sidebar-active-repo');
  const sidebarName = document.getElementById('sidebar-repo-name');
  if (sidebarIndicator && sidebarName) {
    sidebarIndicator.style.display = activeRepo ? 'flex' : 'none';
    sidebarName.textContent = activeRepo || 'None selected';
  }
  
  // Update breadcrumb
  const bcRepo = document.getElementById('breadcrumb-repo');
  const bcName = document.getElementById('breadcrumb-repo-name');
  if (bcRepo && bcName) {
    bcRepo.style.display = activeRepo ? 'inline' : 'none';
    bcName.textContent = activeRepo || '';
  }
}

function updateThemeButton(theme: string) {
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');
  const label = document.getElementById('theme-label');
  if (lightIcon && darkIcon && label) {
    lightIcon.style.display = theme === 'dark' ? 'none' : 'block';
    darkIcon.style.display = theme === 'dark' ? 'block' : 'none';
    label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

// Initialize theme
const savedTheme = localStorage.getItem('bob-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

renderShell();
updateThemeButton(savedTheme);