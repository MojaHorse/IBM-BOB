/**
 * Context Builder Service
 * Transforms raw conflict data into rich, structured context for AI reasoning
 * 
 * This is what makes AI suggestions intelligent vs generic:
 * - Analyzes actual file changes
 * - Detects dependency patterns
 * - Incorporates historical data
 * - Adds repository context
 */

const axios = require('axios');
const relationshipGraph = require('./relationshipGraph');

/**
 * Build comprehensive context for AI reasoning
 * @param {Object} conflict - The detected conflict
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} token - GitHub token
 * @returns {Object} Enriched context for AI
 */
async function buildConflictContext(conflict, owner, repo, token) {
  console.log(`Building context for conflict: ${conflict.id}`);
  
  const devA = conflict.parties?.authorA?.name || 'Dev A';
  const devB = conflict.parties?.authorB?.name || 'Dev B';
  const relationshipInsights = relationshipGraph.getConflictInsights(devA, devB, repo, conflict.overlappingFiles);
  
  const context = {
    // Basic conflict info
    conflict_id: conflict.id,
    risk_level: conflict.riskLevel,
    overlapping_files: conflict.overlappingFiles,
    
    // PR Context
    pr_a: {
      number: conflict.parties.authorA.pr,
      title: conflict.parties.authorA.title,
      author: conflict.parties.authorA.name,
      branch: conflict.parties.authorA.branch
    },
    pr_b: {
      number: conflict.parties.authorB.pr,
      title: conflict.parties.authorB.title,
      author: conflict.parties.authorB.name,
      branch: conflict.parties.authorB.branch
    },
    
    // Enriched context layers
    diff_summary: await buildDiffSummary(conflict, owner, repo, token),
    dependency_signals: analyzeDependencies(conflict.overlappingFiles),
    historical_patterns: getHistoricalPatterns(conflict),
    repo_context: await getRepoContext(owner, repo, token),
    team_context: getTeamContext(conflict),
    relationship_graph: relationshipInsights
  };
  
  return context;
}

/**
 * Build detailed diff summary from PR file changes
 */
async function buildDiffSummary(conflict, owner, repo, token) {
  try {
    // Fetch actual file changes from both PRs
    const [filesA, filesB] = await Promise.all([
      fetchPRFiles(owner, repo, conflict.parties.authorA.pr, token),
      fetchPRFiles(owner, repo, conflict.parties.authorB.pr, token)
    ]);
    
    // Analyze overlapping files
    const overlaps = conflict.overlappingFiles.map(filename => {
      const fileA = filesA.find(f => f.filename === filename);
      const fileB = filesB.find(f => f.filename === filename);
      
      return {
        filename,
        changes_a: {
          additions: fileA?.additions || 0,
          deletions: fileA?.deletions || 0,
          changes: fileA?.changes || 0,
          status: fileA?.status || 'unknown',
          patch_preview: fileA?.patch ? fileA.patch.substring(0, 200) : null
        },
        changes_b: {
          additions: fileB?.additions || 0,
          deletions: fileB?.deletions || 0,
          changes: fileB?.changes || 0,
          status: fileB?.status || 'unknown',
          patch_preview: fileB?.patch ? fileB.patch.substring(0, 200) : null
        },
        total_impact: (fileA?.changes || 0) + (fileB?.changes || 0),
        both_modified: fileA?.status === 'modified' && fileB?.status === 'modified',
        conflict_likelihood: calculateConflictLikelihood(fileA, fileB)
      };
    });
    
    // Calculate overall metrics
    const totalFilesA = filesA.length;
    const totalFilesB = filesB.length;
    const totalImpact = overlaps.reduce((sum, f) => sum + f.total_impact, 0);
    
    return {
      overlapping_files: overlaps,
      total_files_touched_a: totalFilesA,
      total_files_touched_b: totalFilesB,
      conflict_intensity: totalImpact,
      high_impact_files: overlaps.filter(f => f.total_impact > 50).length,
      both_modified_count: overlaps.filter(f => f.both_modified).length
    };
  } catch (error) {
    console.error('Diff summary error:', error.message);
    // Fallback to mock data
    return buildMockDiffSummary(conflict);
  }
}

/**
 * Fetch PR files from GitHub API
 */
async function fetchPRFiles(owner, repo, prNumber, token) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching PR #${prNumber} files:`, error.message);
    return [];
  }
}

/**
 * Calculate likelihood of actual merge conflict
 */
function calculateConflictLikelihood(fileA, fileB) {
  if (!fileA || !fileB) return 'low';
  
  // Both files modified = high likelihood
  if (fileA.status === 'modified' && fileB.status === 'modified') {
    const totalChanges = (fileA.changes || 0) + (fileB.changes || 0);
    if (totalChanges > 100) return 'very-high';
    if (totalChanges > 50) return 'high';
    return 'medium';
  }
  
  // One added, one modified = medium likelihood
  if ((fileA.status === 'added' && fileB.status === 'modified') ||
      (fileA.status === 'modified' && fileB.status === 'added')) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Build mock diff summary when GitHub API unavailable
 */
function buildMockDiffSummary(conflict) {
  const overlaps = conflict.overlappingFiles.map(filename => ({
    filename,
    changes_a: {
      additions: Math.floor(Math.random() * 50) + 10,
      deletions: Math.floor(Math.random() * 30) + 5,
      changes: Math.floor(Math.random() * 80) + 15,
      status: 'modified'
    },
    changes_b: {
      additions: Math.floor(Math.random() * 50) + 10,
      deletions: Math.floor(Math.random() * 30) + 5,
      changes: Math.floor(Math.random() * 80) + 15,
      status: 'modified'
    },
    total_impact: Math.floor(Math.random() * 150) + 30,
    both_modified: true,
    conflict_likelihood: 'high'
  }));
  
  return {
    overlapping_files: overlaps,
    total_files_touched_a: conflict.overlappingFiles.length + 2,
    total_files_touched_b: conflict.overlappingFiles.length + 3,
    conflict_intensity: overlaps.reduce((sum, f) => sum + f.total_impact, 0),
    high_impact_files: overlaps.filter(f => f.total_impact > 50).length,
    both_modified_count: overlaps.length,
    is_mock: true
  };
}

/**
 * Analyze dependency patterns and risk signals
 */
function analyzeDependencies(files) {
  const signals = {
    // Core module detection
    is_core_module: files.some(f => 
      f.includes('auth') || 
      f.includes('config') || 
      f.includes('middleware') ||
      f.includes('security') ||
      f.includes('payment')
    ),
    
    // API endpoint detection
    is_api_endpoint: files.some(f => 
      f.includes('routes') || 
      f.includes('api') || 
      f.includes('controller') ||
      f.includes('endpoint')
    ),
    
    // Database layer detection
    is_database_layer: files.some(f => 
      f.includes('model') || 
      f.includes('schema') || 
      f.includes('migration') ||
      f.includes('db/') ||
      f.includes('database')
    ),
    
    // UI component detection
    is_ui_component: files.some(f => 
      f.includes('component') || 
      f.includes('view') || 
      f.includes('.tsx') ||
      f.includes('.jsx') ||
      f.includes('styles') ||
      f.includes('css')
    ),
    
    // Dependency file detection
    touches_dependencies: files.some(f =>
      f.includes('package.json') ||
      f.includes('package-lock.json') ||
      f.includes('yarn.lock') ||
      f.includes('requirements.txt') ||
      f.includes('Gemfile') ||
      f.includes('go.mod')
    ),
    
    // Configuration file detection
    touches_config: files.some(f =>
      f.includes('config') ||
      f.includes('.env') ||
      f.includes('docker') ||
      f.includes('kubernetes')
    ),
    
    // Calculate overall dependency risk
    dependency_risk: calculateDependencyRisk(files),
    
    // Identify specific risk areas
    risk_areas: identifyRiskAreas(files),
    
    // Estimate downstream impact
    downstream_impact: estimateDownstreamImpact(files)
  };
  
  return signals;
}

/**
 * Calculate overall dependency risk level
 */
function calculateDependencyRisk(files) {
  let riskScore = 0;
  
  // Core modules = high risk
  if (files.some(f => f.includes('auth') || f.includes('security') || f.includes('payment'))) {
    riskScore += 3;
  }
  
  // Database changes = high risk
  if (files.some(f => f.includes('schema') || f.includes('migration'))) {
    riskScore += 3;
  }
  
  // API changes = medium risk
  if (files.some(f => f.includes('api') || f.includes('routes'))) {
    riskScore += 2;
  }
  
  // Config changes = medium risk
  if (files.some(f => f.includes('config'))) {
    riskScore += 2;
  }
  
  // Multiple files = increased risk
  if (files.length > 3) {
    riskScore += 1;
  }
  
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

/**
 * Identify specific risk areas
 */
function identifyRiskAreas(files) {
  const areas = [];
  
  if (files.some(f => f.includes('auth') || f.includes('security'))) {
    areas.push('authentication', 'security');
  }
  if (files.some(f => f.includes('payment') || f.includes('billing'))) {
    areas.push('payments', 'financial');
  }
  if (files.some(f => f.includes('db') || f.includes('schema'))) {
    areas.push('data-integrity', 'migrations');
  }
  if (files.some(f => f.includes('api') || f.includes('routes'))) {
    areas.push('api-contracts', 'backwards-compatibility');
  }
  if (files.some(f => f.includes('config'))) {
    areas.push('configuration', 'deployment');
  }
  
  return areas.length > 0 ? areas : ['code-quality'];
}

/**
 * Estimate downstream impact
 */
function estimateDownstreamImpact(files) {
  if (files.some(f => f.includes('auth') || f.includes('security'))) {
    return 'all-services';
  }
  if (files.some(f => f.includes('api') || f.includes('routes'))) {
    return 'api-consumers';
  }
  if (files.some(f => f.includes('db') || f.includes('schema'))) {
    return 'data-dependent-services';
  }
  if (files.some(f => f.includes('ui') || f.includes('component'))) {
    return 'frontend-only';
  }
  return 'isolated';
}

/**
 * Get historical conflict patterns
 */
function getHistoricalPatterns(conflict) {
  // In production: query git history for these files
  // For MVP: use mock data from conflict scenarios
  
  const patterns = {
    frequent_conflict_files: conflict.overlappingFiles.filter(f => 
      f.includes('auth') || 
      f.includes('payment') ||
      f.includes('config')
    ),
    conflict_frequency: determineConflictFrequency(conflict.overlappingFiles),
    typical_resolution_time: estimateResolutionTime(conflict.riskLevel),
    last_conflict_date: generateRecentDate(),
    resolution_success_rate: 0.85,
    common_resolution_strategies: getCommonStrategies(conflict.riskLevel)
  };
  
  return patterns;
}

/**
 * Determine how frequently these files conflict
 */
function determineConflictFrequency(files) {
  if (files.some(f => f.includes('auth') || f.includes('payment'))) {
    return 'high';
  }
  if (files.some(f => f.includes('api') || f.includes('config'))) {
    return 'medium';
  }
  return 'low';
}

/**
 * Estimate typical resolution time based on risk
 */
function estimateResolutionTime(riskLevel) {
  const times = {
    'High': '4-6 hours',
    'Medium': '2-3 hours',
    'Low': '1-2 hours'
  };
  return times[riskLevel] || '2-3 hours';
}

/**
 * Generate a recent date for last conflict
 */
function generateRecentDate() {
  const daysAgo = Math.floor(Math.random() * 14) + 1; // 1-14 days ago
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * Get common resolution strategies for risk level
 */
function getCommonStrategies(riskLevel) {
  if (riskLevel === 'High') {
    return ['joint-review', 'sequential-merge', 'refactor-shared-code'];
  }
  if (riskLevel === 'Medium') {
    return ['sequential-merge', 'coordination-meeting', 'rebase-strategy'];
  }
  return ['simple-merge', 'author-coordination'];
}

/**
 * Get repository context
 */
async function getRepoContext(owner, repo, token) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    const repoData = response.data;
    
    return {
      language: repoData.language,
      size: repoData.size,
      open_issues: repoData.open_issues_count,
      default_branch: repoData.default_branch,
      is_private: repoData.private,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      topics: repoData.topics || [],
      has_wiki: repoData.has_wiki,
      has_projects: repoData.has_projects
    };
  } catch (error) {
    console.error('Repo context error:', error.message);
    return {
      language: 'JavaScript',
      size: 1024,
      open_issues: 5,
      default_branch: 'main',
      is_private: false,
      error: 'Unable to fetch full repo context'
    };
  }
}

/**
 * Get team context from conflict data
 */
function getTeamContext(conflict) {
  // Extract team info if available in conflict data
  if (conflict.team_context) {
    return conflict.team_context;
  }
  
  // Default team context
  return {
    name: 'Development Team',
    lead: 'Team Lead',
    size: 5,
    expertise: ['full-stack development']
  };
}

/**
 * Cache for context data to reduce API calls
 */
const contextCache = new Map();

/**
 * Get cached context or build new one
 */
async function getCachedContext(conflict, owner, repo, token) {
  const cacheKey = `${owner}/${repo}/${conflict.id}`;
  
  if (contextCache.has(cacheKey)) {
    console.log(`Using cached context for ${cacheKey}`);
    return contextCache.get(cacheKey);
  }
  
  const context = await buildConflictContext(conflict, owner, repo, token);
  contextCache.set(cacheKey, context);
  
  // Clear cache after 5 minutes
  setTimeout(() => {
    contextCache.delete(cacheKey);
  }, 5 * 60 * 1000);
  
  return context;
}

module.exports = {
  buildConflictContext,
  getCachedContext,
  analyzeDependencies,
  getHistoricalPatterns
};

// Made with Bob
