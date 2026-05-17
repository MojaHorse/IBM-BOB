import axios from "axios";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4500") + "/api";

export async function renderSimulations(container: HTMLElement) {
  const token = localStorage.getItem("github_token");
  
  // Gate: require GitHub connection
  if (!token) {
    container.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Predictive Analytics · What-If Scenarios</p>
        <h1>Resolution Simulations</h1>
        <p class="subtitle">Connect your GitHub account and scan a repository to begin.</p>
      </section>
      <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <p style="color:var(--text-secondary); font-size:16px; max-width:400px">Connect your GitHub account first, then scan a repository to access resolution simulations.</p>
        <button class="btn-primary" id="goto-connect-sim">Connect GitHub</button>
      </div>
    `;
    document.getElementById('goto-connect-sim')?.addEventListener('click', () => {
      window.location.href = `${API}/auth/github`;
    });
    return;
  }

  container.innerHTML = `<div class="loading-state">Loading simulations...</div>`;
  
  try {
    const lastScanRes = await axios.get(`${API}/github/last-scan`);
    const scan = lastScanRes.data;

    if (!scan || !scan.conflicts || scan.conflicts.length === 0) {
      container.innerHTML = `
        <section class="hero">
          <p class="eyebrow">Predictive Analytics · What-If Scenarios</p>
          <h1>Resolution Simulations</h1>
          <p class="subtitle">No conflicts available for simulation. Scan a repository first.</p>
        </section>
        <div class="card large" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <p style="color:var(--text-secondary); font-size:16px; max-width:400px">Simulate resolution strategies to predict outcomes before taking action.</p>
          <button class="btn-primary" id="goto-radar">Go to Conflict Radar</button>
        </div>
      `;
      document.getElementById('goto-radar')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('bob-navigate', { detail: 'conflict-radar-ai' }));
      });
      return;
    }

    // Fetch simulations
    const simulationsRes = await axios.get(`${API}/simulations`);
    const simulations = simulationsRes.data.simulations || [];

    renderSimulationResults(container, scan, simulations);
  } catch (error) {
    console.error('Error loading simulations:', error);
    container.innerHTML = `<div class="card large"><h2>Could not load simulations</h2><p style="color:var(--text-secondary)">Make sure the backend is running.</p></div>`;
  }
}

function renderSimulationResults(container: HTMLElement, scan: any, simulations: any[]) {
  const conflicts = scan.conflicts || [];
  const avgSuccess = simulations.length > 0 
    ? (simulations.reduce((sum: number, s: any) => sum + s.successProbability, 0) / simulations.length * 100).toFixed(0)
    : 0;
  const avgTime = simulations.length > 0
    ? Math.round(simulations.reduce((sum: number, s: any) => sum + s.timeToResolution, 0) / simulations.length)
    : 0;

  container.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Predictive Analytics · What-If Scenarios</p>
      <h1>Resolution Simulations</h1>
      <p class="subtitle">${scan.repo} · ${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} · ${simulations.length} simulation${simulations.length !== 1 ? 's' : ''} available</p>
    </section>

    <!-- Simulation Stats -->
    <section class="grid stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px">
      <div class="card stat-card simulation-card">
        <p class="label">Avg Success Rate</p>
        <h2 class="${Number(avgSuccess) >= 80 ? 'safe' : 'warning'}">${avgSuccess}%</h2>
        <p class="stat-detail">Predicted outcomes</p>
      </div>
      <div class="card stat-card simulation-card">
        <p class="label">Avg Resolution Time</p>
        <h2>${avgTime}h</h2>
        <p class="stat-detail">Expected duration</p>
      </div>
      <div class="card stat-card simulation-card">
        <p class="label">Simulations Run</p>
        <h2>${simulations.length}</h2>
        <p class="stat-detail">Strategies analyzed</p>
      </div>
      <div class="card stat-card simulation-card">
        <p class="label">Confidence</p>
        <h2 class="safe">${simulations.length > 0 ? Math.round(simulations[0].confidence * 100) : 0}%</h2>
        <p class="stat-detail">Model certainty</p>
      </div>
    </section>

    <!-- Conflict Simulations -->
    <div class="grid" style="gap:24px">
      ${conflicts.map((c: any, idx: number) => {
        const simulation = simulations.find((s: any) => s.conflictId === c.id);
        return renderConflictSimulation(c, idx, simulation);
      }).join("")}
    </div>
  `;

  // Wire compare strategies buttons
  container.querySelectorAll('.compare-strategies-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const conflictId = (e.currentTarget as HTMLElement).getAttribute('data-conflict-id');
      if (!conflictId) return;
      
      const button = e.currentTarget as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Comparing...';
      
      try {
        const token = localStorage.getItem("github_token");
        const response = await axios.post(`${API}/conflicts/${conflictId}/compare-strategies`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        showComparisonModal(response.data);
      } catch (error) {
        console.error('Comparison failed:', error);
        alert('Failed to compare strategies. Make sure AI analysis is available.');
      } finally {
        button.disabled = false;
        button.textContent = '📊 Compare Strategies';
      }
    });
  });

  // Wire simulate buttons
  container.querySelectorAll('.simulate-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const conflictId = (e.currentTarget as HTMLElement).getAttribute('data-conflict-id');
      if (!conflictId) return;
      
      const button = e.currentTarget as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Simulating...';
      
      try {
        const token = localStorage.getItem("github_token");
        const response = await axios.post(`${API}/conflicts/${conflictId}/simulate`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        showSimulationModal(response.data);
      } catch (error) {
        console.error('Simulation failed:', error);
        alert('Failed to run simulation. Make sure AI analysis is available.');
      } finally {
        button.disabled = false;
        button.textContent = '🔮 Run Simulation';
      }
    });
  });
}

function renderConflictSimulation(c: any, idx: number, simulation: any): string {
  const riskColor = c.riskLevel === 'High' ? 'critical' : (c.riskLevel === 'Medium' ? 'warning' : 'healthy');
  const hasSimulation = !!simulation;

  return `
    <div class="card simulation-card" style="padding:0; overflow:hidden">
      <!-- Header -->
      <div class="simulation-header" style="padding: 20px 24px; background: var(--bg-base)">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
            <span class="status-pill ${riskColor}" style="font-size:12px; padding:4px 12px">${c.riskLevel} Risk</span>
            <span style="font-size:12px; color:var(--text-secondary)">Conflict #${idx + 1}</span>
          </div>
          <h3 style="margin: 0; font-size: 16px">${c.overlappingFiles?.[0] || 'Unknown file'}</h3>
          <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary)">${c.overlappingFiles?.length || 0} file(s) affected</p>
        </div>
        <div style="display: flex; gap: 8px">
          <button class="compare-strategies-btn" data-conflict-id="${c.id}" style="background: var(--accent-blue); color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; white-space: nowrap">
            📊 Compare Strategies
          </button>
          <button class="simulate-btn" data-conflict-id="${c.id}" style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-strong); padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; white-space: nowrap">
            🔮 Run Simulation
          </button>
        </div>
      </div>

      <div style="padding: 24px">
        ${hasSimulation ? renderSimulationDetails(simulation) : renderNoSimulation()}
      </div>
    </div>
  `;
}

function renderSimulationDetails(simulation: any): string {
  const successColor = simulation.successProbability >= 0.8 ? 'var(--accent-green)' : 
                       simulation.successProbability >= 0.6 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  return `
    <!-- Quick Metrics -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px">
      <div class="simulation-metric">
        <span class="simulation-metric-label">Success Probability</span>
        <span class="simulation-metric-value" style="color: ${successColor}">${(simulation.successProbability * 100).toFixed(0)}%</span>
        <div class="simulation-progress-bar">
          <div class="simulation-progress-fill" style="width: ${simulation.successProbability * 100}%; background: ${successColor}"></div>
        </div>
      </div>
      <div class="simulation-metric">
        <span class="simulation-metric-label">Est. Resolution Time</span>
        <span class="simulation-metric-value">${simulation.timeToResolution}h</span>
        <span style="font-size: 12px; color: var(--text-secondary)">Realistic estimate</span>
      </div>
      <div class="simulation-metric">
        <span class="simulation-metric-label">Risk Count</span>
        <span class="simulation-metric-value" style="color: ${simulation.riskCount > 2 ? 'var(--accent-red)' : 'var(--accent-green)'}">${simulation.riskCount}</span>
        <span style="font-size: 12px; color: var(--text-secondary)">Identified risks</span>
      </div>
    </div>

    <!-- Strategy -->
    <div style="margin-bottom: 20px">
      <p class="label" style="margin-bottom: 8px">Recommended Strategy</p>
      <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px">
        <strong style="font-size: 14px; color: var(--text-primary); text-transform: capitalize">${simulation.strategy.replace(/-/g, ' ')}</strong>
        <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary)">Based on historical patterns and conflict analysis</p>
      </div>
    </div>

    <!-- Confidence Badge -->
    <div style="display: flex; justify-content: flex-end">
      <span class="prediction-badge">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
        ${(simulation.confidence * 100).toFixed(0)}% Confidence
      </span>
    </div>
  `;
}

function renderNoSimulation(): string {
  return `
    <div style="text-align: center; padding: 40px 20px">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5" style="margin-bottom: 16px">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <h3 style="margin: 0 0 8px; font-size: 16px">No Simulation Available</h3>
      <p style="margin: 0; color: var(--text-secondary); font-size: 14px">Click "Run Simulation" to predict outcomes</p>
    </div>
  `;
}

function showComparisonModal(data: any) {
  const comparison = data.comparison;
  const recommended = comparison.recommended;
  const alternatives = comparison.alternatives || [];

  const modalHTML = `
    <div class="modal-overlay" id="comparison-modal">
      <div class="modal-content" style="max-width: 800px">
        <div class="modal-header">
          <h2>Strategy Comparison</h2>
          <button class="close-btn" id="close-comparison">×</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 20px; color: var(--text-secondary)">Comparing ${alternatives.length + 1} resolution strategies based on success probability, time, and risk.</p>
          
          <!-- Recommended Strategy -->
          <div style="background: linear-gradient(135deg, rgba(52, 199, 89, 0.05) 0%, rgba(52, 199, 89, 0.02) 100%); border: 2px solid var(--accent-green); border-radius: 10px; padding: 20px; margin-bottom: 16px">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px">
              <div>
                <span class="prediction-badge" style="margin-bottom: 8px">⭐ Recommended</span>
                <h3 style="margin: 8px 0 4px; font-size: 18px; text-transform: capitalize">${recommended.strategy.replace(/-/g, ' ')}</h3>
                <p style="margin: 0; font-size: 13px; color: var(--text-secondary)">Score: ${recommended.score.toFixed(1)}/100</p>
              </div>
              <div style="text-align: right">
                <div style="font-size: 28px; font-weight: 700; color: var(--accent-green)">${(recommended.simulation.predictions.successProbability * 100).toFixed(0)}%</div>
                <div style="font-size: 12px; color: var(--text-secondary)">Success Rate</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px">
              <div>
                <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase">Time</span>
                <div style="font-size: 16px; font-weight: 600">${recommended.simulation.predictions.timeToResolution.realistic}h</div>
              </div>
              <div>
                <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase">Risks</span>
                <div style="font-size: 16px; font-weight: 600">${recommended.simulation.risks.length}</div>
              </div>
              <div>
                <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase">Confidence</span>
                <div style="font-size: 16px; font-weight: 600">${(recommended.simulation.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          <!-- Alternative Strategies -->
          ${alternatives.length > 0 ? `
            <h3 style="margin: 24px 0 12px; font-size: 14px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em">Alternative Strategies</h3>
            ${alternatives.map((alt: any) => `
              <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 12px">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
                  <h4 style="margin: 0; font-size: 15px; text-transform: capitalize">${alt.strategy.replace(/-/g, ' ')}</h4>
                  <span style="font-size: 20px; font-weight: 700; color: ${alt.simulation.predictions.successProbability >= 0.7 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">${(alt.simulation.predictions.successProbability * 100).toFixed(0)}%</span>
                </div>
                <div style="display: flex; gap: 20px; font-size: 13px; color: var(--text-secondary)">
                  <span>Score: ${alt.score.toFixed(1)}/100</span>
                  <span>Time: ${alt.simulation.predictions.timeToResolution.realistic}h</span>
                  <span>Risks: ${alt.simulation.risks.length}</span>
                </div>
              </div>
            `).join('')}
          ` : ''}

          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center">
            <button class="btn-primary" id="close-comparison-btn">Got It</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const closeModal = () => {
    document.getElementById('comparison-modal')?.remove();
  };

  document.getElementById('close-comparison')?.addEventListener('click', closeModal);
  document.getElementById('close-comparison-btn')?.addEventListener('click', closeModal);
  document.getElementById('comparison-modal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'comparison-modal') closeModal();
  });
}

function showSimulationModal(data: any) {
  const sim = data.simulation;
  const predictions = sim.predictions;

  const modalHTML = `
    <div class="modal-overlay" id="simulation-modal">
      <div class="modal-content" style="max-width: 700px">
        <div class="modal-header">
          <h2>Simulation Results</h2>
          <button class="close-btn" id="close-simulation">×</button>
        </div>
        <div class="modal-body">
          <h3 style="margin: 0 0 16px; font-size: 16px; text-transform: capitalize">${data.strategy.replace(/-/g, ' ')}</h3>
          
          <!-- Predictions -->
          <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; margin-bottom: 20px">
            <h4 style="margin: 0 0 16px; font-size: 14px; color: var(--text-tertiary); text-transform: uppercase">Predictions</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px">
              <div>
                <span style="font-size: 12px; color: var(--text-tertiary)">Success Probability</span>
                <div style="font-size: 24px; font-weight: 700; color: ${predictions.successProbability >= 0.8 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">${(predictions.successProbability * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span style="font-size: 12px; color: var(--text-tertiary)">Resolution Time</span>
                <div style="font-size: 24px; font-weight: 700">${predictions.timeToResolution.realistic}h</div>
                <span style="font-size: 11px; color: var(--text-tertiary)">${predictions.timeToResolution.optimistic}h - ${predictions.timeToResolution.pessimistic}h range</span>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          ${sim.timeline && sim.timeline.length > 0 ? `
            <div style="margin-bottom: 20px">
              <h4 style="margin: 0 0 12px; font-size: 14px; color: var(--text-tertiary); text-transform: uppercase">Predicted Timeline</h4>
              <div class="impact-timeline">
                ${sim.timeline.map((item: any) => `
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                      <div class="timeline-time">${item.phase} · ${item.timeRange}</div>
                      <div class="timeline-description">
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px">
                          ${item.actions.map((action: string) => `<li>${action}</li>`).join('')}
                        </ul>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Risks -->
          ${sim.risks && sim.risks.length > 0 ? `
            <div style="margin-bottom: 20px">
              <h4 style="margin: 0 0 12px; font-size: 14px; color: var(--text-tertiary); text-transform: uppercase">Identified Risks (${sim.risks.length})</h4>
              ${sim.risks.map((risk: any) => `
                <div class="alert" style="margin-bottom: 8px">
                  <strong>${risk.type.replace(/_/g, ' ').toUpperCase()} · ${(risk.probability * 100).toFixed(0)}% probability</strong>
                  <p>${risk.description}</p>
                  <p style="font-size: 12px; color: var(--text-tertiary)">Mitigation: ${risk.mitigation}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center">
            <button class="btn-primary" id="close-simulation-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const closeModal = () => {
    document.getElementById('simulation-modal')?.remove();
  };

  document.getElementById('close-simulation')?.addEventListener('click', closeModal);
  document.getElementById('close-simulation-btn')?.addEventListener('click', closeModal);
  document.getElementById('simulation-modal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'simulation-modal') closeModal();
  });
}

// Made with Bob
