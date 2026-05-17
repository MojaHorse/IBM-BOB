/**
 * Hybrid Data Service
 * Combines real GitHub data with rich mock scenarios for compelling demos
 * 
 * Strategy:
 * - Use REAL GitHub API for: repo names, PR titles, authors, timestamps
 * - Use MOCK data for: conflict scenarios, file diffs, historical patterns
 * - Blend seamlessly so demo feels authentic
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Get hybrid repository data
 * Real GitHub metadata + Mock conflict scenarios
 */
async function getHybridRepoData(owner, repo, token) {
  try {
    // Fetch real GitHub repository data
    const realRepo = await fetchRealRepo(owner, repo, token);
    
    // Select mock scenario based on repo characteristics
    const mockScenario = selectScenarioForRepo(realRepo);
    
    // Blend real and mock data
    return {
      // Real data from GitHub
      name: realRepo.name,
      full_name: realRepo.full_name,
      owner: realRepo.owner.login,
      language: realRepo.language,
      description: realRepo.description,
      updated_at: realRepo.updated_at,
      default_branch: realRepo.default_branch,
      open_issues_count: realRepo.open_issues_count,
      size: realRepo.size,
      
      // Mock enrichment (but realistic)
      conflicts: mockScenario.conflicts,
      historical_patterns: mockScenario.patterns,
      dependency_graph: mockScenario.dependencies,
      team_context: mockScenario.team,
      
      // Metadata
      is_hybrid: true,
      real_data_source: 'github_api',
      mock_data_source: 'scenario_library'
    };
  } catch (error) {
    console.error('Hybrid data error:', error.message);
    // Fallback to pure mock data if GitHub API fails
    return getPureMockData(owner, repo);
  }
}

/**
 * Fetch real repository data from GitHub
 */
async function fetchRealRepo(owner, repo, token) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }
  );
  return response.data;
}

/**
 * Select appropriate mock scenario based on real repo characteristics
 * This ensures mock data feels relevant to the actual repository
 */
function selectScenarioForRepo(realRepo) {
  const scenarios = loadScenarios();
  
  // Hash repo name for consistent scenario selection
  let hash = 0;
  for (let i = 0; i < realRepo.name.length; i++) {
    hash = ((hash << 5) - hash) + realRepo.name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const scenarioIndex = Math.abs(hash) % scenarios.length;
  
  // Get base scenario
  const scenario = scenarios[scenarioIndex];
  
  // Customize scenario based on repo language
  const customized = customizeScenarioForLanguage(scenario, realRepo.language);
  
  return customized;
}

/**
 * Customize mock scenario based on repository language
 */
function customizeScenarioForLanguage(scenario, language) {
  const languageFileExtensions = {
    'JavaScript': '.js',
    'TypeScript': '.ts',
    'Python': '.py',
    'Java': '.java',
    'Go': '.go',
    'Ruby': '.rb',
    'PHP': '.php',
    'C#': '.cs',
    'C++': '.cpp',
    'Rust': '.rs'
  };
  
  const ext = languageFileExtensions[language] || '.js';
  
  // Update file paths to match language
  const customized = JSON.parse(JSON.stringify(scenario)); // Deep clone
  
  customized.conflicts = customized.conflicts.map(conflict => ({
    ...conflict,
    overlappingFiles: conflict.overlappingFiles.map(file => {
      // Replace extension with language-appropriate one
      return file.replace(/\.\w+$/, ext);
    })
  }));
  
  return customized;
}

/**
 * Load mock scenarios from JSON file
 */
function loadScenarios() {
  const scenariosPath = path.join(__dirname, '../data/conflictScenarios.json');
  
  // Check if file exists, if not create default scenarios
  if (!fs.existsSync(scenariosPath)) {
    return getDefaultScenarios();
  }
  
  try {
    const data = fs.readFileSync(scenariosPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading scenarios:', error.message);
    return getDefaultScenarios();
  }
}

/**
 * Default conflict scenarios
 */
function getDefaultScenarios() {
  return [
    {
      id: 'auth-conflict',
      conflicts: [
        {
          overlappingFiles: ['src/auth/middleware.js', 'src/auth/validator.js'],
          riskLevel: 'High',
          explanation: 'Both PRs modify authentication logic. Changes to auth middleware and validator could create security vulnerabilities if not coordinated.',
          parties: {
            authorA: { name: 'Alice', pr: 42 },
            authorB: { name: 'Bob', pr: 45 }
          }
        }
      ],
      patterns: {
        frequent_conflict_files: ['src/auth/middleware.js'],
        conflict_frequency: 'high',
        typical_resolution_time: '4 hours',
        last_conflict_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      dependencies: {
        is_core_module: true,
        is_api_endpoint: true,
        dependency_risk: 'high'
      },
      team: {
        name: 'Security Team',
        lead: 'Maya',
        size: 5
      }
    },
    {
      id: 'api-conflict',
      conflicts: [
        {
          overlappingFiles: ['src/api/routes.js', 'src/api/controllers/user.js'],
          riskLevel: 'Medium',
          explanation: 'Both PRs modify API routing and user controller. Potential for endpoint conflicts or breaking changes.',
          parties: {
            authorA: { name: 'Charlie', pr: 38 },
            authorB: { name: 'Diana', pr: 40 }
          }
        }
      ],
      patterns: {
        frequent_conflict_files: ['src/api/routes.js'],
        conflict_frequency: 'medium',
        typical_resolution_time: '2 hours',
        last_conflict_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      dependencies: {
        is_core_module: false,
        is_api_endpoint: true,
        dependency_risk: 'medium'
      },
      team: {
        name: 'Backend Team',
        lead: 'Zain',
        size: 8
      }
    },
    {
      id: 'ui-conflict',
      conflicts: [
        {
          overlappingFiles: ['src/components/Dashboard.tsx', 'src/styles/theme.css'],
          riskLevel: 'Low',
          explanation: 'Both PRs modify UI components and styling. Low risk but coordination needed for consistent design.',
          parties: {
            authorA: { name: 'Eve', pr: 51 },
            authorB: { name: 'Frank', pr: 52 }
          }
        }
      ],
      patterns: {
        frequent_conflict_files: ['src/styles/theme.css'],
        conflict_frequency: 'low',
        typical_resolution_time: '1 hour',
        last_conflict_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      dependencies: {
        is_core_module: false,
        is_api_endpoint: false,
        dependency_risk: 'low'
      },
      team: {
        name: 'Frontend Team',
        lead: 'Thato',
        size: 6
      }
    },
    {
      id: 'database-conflict',
      conflicts: [
        {
          overlappingFiles: ['src/db/schema.sql', 'src/db/migrations/001_add_users.sql'],
          riskLevel: 'High',
          explanation: 'Both PRs modify database schema. Schema conflicts can cause data corruption or deployment failures.',
          parties: {
            authorA: { name: 'Grace', pr: 33 },
            authorB: { name: 'Henry', pr: 35 }
          }
        }
      ],
      patterns: {
        frequent_conflict_files: ['src/db/schema.sql'],
        conflict_frequency: 'medium',
        typical_resolution_time: '6 hours',
        last_conflict_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      dependencies: {
        is_core_module: true,
        is_api_endpoint: false,
        dependency_risk: 'high'
      },
      team: {
        name: 'Data Team',
        lead: 'Priya',
        size: 4
      }
    },
    {
      id: 'config-conflict',
      conflicts: [
        {
          overlappingFiles: ['config/app.json', 'config/environment.js'],
          riskLevel: 'Medium',
          explanation: 'Both PRs modify application configuration. Conflicting config changes can break deployments.',
          parties: {
            authorA: { name: 'Ivy', pr: 28 },
            authorB: { name: 'Jack', pr: 30 }
          }
        }
      ],
      patterns: {
        frequent_conflict_files: ['config/app.json'],
        conflict_frequency: 'medium',
        typical_resolution_time: '3 hours',
        last_conflict_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      dependencies: {
        is_core_module: true,
        is_api_endpoint: false,
        dependency_risk: 'medium'
      },
      team: {
        name: 'DevOps Team',
        lead: 'Alex',
        size: 5
      }
    }
  ];
}

/**
 * Fallback to pure mock data if GitHub API fails
 */
function getPureMockData(owner, repo) {
  const scenarios = getDefaultScenarios();
  const scenario = scenarios[0]; // Use first scenario as fallback
  
  return {
    name: repo,
    full_name: `${owner}/${repo}`,
    owner: owner,
    language: 'JavaScript',
    description: 'Mock repository for demo purposes',
    updated_at: new Date().toISOString(),
    default_branch: 'main',
    open_issues_count: 5,
    size: 1024,
    
    conflicts: scenario.conflicts,
    historical_patterns: scenario.patterns,
    dependency_graph: scenario.dependencies,
    team_context: scenario.team,
    
    is_hybrid: false,
    real_data_source: 'fallback',
    mock_data_source: 'default_scenario'
  };
}

/**
 * Enrich real PR data with mock conflict details
 */
function enrichPRWithMockData(realPR, mockConflict) {
  return {
    // Real PR data
    number: realPR.number,
    title: realPR.title,
    author: realPR.user.login,
    created_at: realPR.created_at,
    updated_at: realPR.updated_at,
    state: realPR.state,
    
    // Mock enrichment
    filesChanged: mockConflict.overlappingFiles,
    commitsBehind: Math.floor(Math.random() * 10),
    branch: realPR.head.ref,
    
    // Metadata
    is_enriched: true
  };
}

module.exports = {
  getHybridRepoData,
  enrichPRWithMockData,
  loadScenarios
};

// Made with Bob
