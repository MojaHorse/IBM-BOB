/**
 * Conflict Engine - Generate conflicts from scenarios
 * Simple, scenario-based approach - no complex PR fetching
 */

const conflictScenarios = require('../../data/conflictScenarios.json');

class ConflictEngine {
  /**
   * Generate conflicts for a repo (scenario-based)
   */
  generateConflicts(repoName, repoLanguage = 'JavaScript') {
    // Select scenario based on repo name (consistent)
    const scenario = this.selectScenario(repoName);
    
    // Customize scenario for repo name and language
    const customized = this.customizeForRepo(scenario, repoName, repoLanguage);
    
    // Flatten scenario to combine ID with actual conflict details
    const flattenedConflict = {
      id: customized.id,
      name: customized.name,
      ...customized.conflicts[0],
      patterns: customized.patterns,
      dependencies: customized.dependencies,
      team: customized.team
    };
    
    return {
      repo: repoName,
      conflicts: [flattenedConflict],
      openPullRequestCount: 2,
      activeBranchCount: 2,
      scannedAt: new Date().toISOString(),
      isDemo: true // Be honest - this is demo data
    };
  }
  
  /**
   * Select scenario consistently based on repo name
   */
  selectScenario(repoName) {
    const hash = this.hashString(repoName);
    const index = hash % conflictScenarios.length;
    const scenario = conflictScenarios[index];
    
    // Clone to avoid modifying original
    return JSON.parse(JSON.stringify(scenario));
  }
  
  /**
   * Customize scenario for the specific repository name and programming language
   */
  customizeForRepo(scenario, repoName, language) {
    const ext = this.getExtensionForLanguage(language);
    const lowerName = repoName.toLowerCase();
    
    // Dynamically generate realistic file paths based on the repo's name
    let files = [];

    if (lowerName.includes('web') || lowerName.includes('ui') || lowerName.includes('frontend') || lowerName.includes('react')) {
      files = [`src/components/Navigation${ext}`, `src/hooks/useData${ext}`, `src/pages/index${ext}`];
    } else if (lowerName.includes('api') || lowerName.includes('backend') || lowerName.includes('service')) {
      files = [`src/controllers/mainController${ext}`, `src/services/database${ext}`, `src/middleware/auth${ext}`];
    } else if (lowerName.includes('auth') || lowerName.includes('identity')) {
      files = [`src/oauth/provider${ext}`, `src/security/encryption${ext}`, `src/models/user${ext}`];
    } else if (lowerName.includes('data') || lowerName.includes('pipeline')) {
      files = [`jobs/extractor${ext}`, `models/schema${ext}`, `utils/transform${ext}`];
    } else if (lowerName.includes('mobile') || lowerName.includes('app') || lowerName.includes('ios')) {
      files = [`screens/Home${ext}`, `store/actions${ext}`, `components/TabBar${ext}`];
    } else {
      // Create a specific prefix based on the repo name for credibility
      const prefix = repoName.split(/[-_]/)[0].replace(/[^a-zA-Z]/g, '').toLowerCase() || 'core';
      files = [`src/${prefix}/${prefix}Manager${ext}`, `src/${prefix}/config${ext}`, `src/shared/utils${ext}`];
    }

    // Assign the dynamically generated files to the simulated conflict
    scenario.overlappingFiles = files;
    
    // Inject the real repo name into the AI explanation
    if (scenario.explanation) {
      scenario.explanation = scenario.explanation.replace(/this repository/gi, repoName);
      scenario.explanation = scenario.explanation.replace(/these files/gi, `the core files in ${repoName}`);
    }

    return scenario;
  }

  /**
   * Helper: Get file extension for language
   */
  getExtensionForLanguage(language) {
    const exts = {
      'JavaScript': '.js',
      'TypeScript': '.ts',
      'Python': '.py',
      'Java': '.java',
      'Go': '.go',
      'Ruby': '.rb',
      'PHP': '.php',
      'C#': '.cs',
      'C++': '.cpp',
      'Rust': '.rs',
      'Swift': '.swift'
    };
    return exts[language] || '.js';
  }
  
  /**
   * Hash string to number (for consistent selection)
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Get all available scenarios
   */
  getAllScenarios() {
    return conflictScenarios;
  }
  
  /**
   * Get scenario by ID
   */
  getScenarioById(id) {
    return conflictScenarios.find(s => s.id === id);
  }
}

module.exports = new ConflictEngine();

// Made with Bob
