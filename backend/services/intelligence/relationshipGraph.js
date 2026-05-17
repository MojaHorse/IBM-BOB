/**
 * Relationship Graph Engine
 * Determines historical and organizational relationships between developers, teams, and files.
 */

class RelationshipGraph {
  
  /**
   * Get relationship insights for a specific conflict scenario
   */
  getConflictInsights(partyA, partyB, repoName, files) {
    const devDynamics = this._analyzeDeveloperDynamics(partyA, partyB);
    const teamDynamics = this._analyzeTeamDynamics(repoName);
    const fileHotspots = this._analyzeHotspots(repoName, files);

    return {
      developers: devDynamics,
      teams: teamDynamics,
      hotspots: fileHotspots,
      summary: `High friction detected between ${partyA} and ${partyB} on ${repoName}.`
    };
  }

  _analyzeDeveloperDynamics(partyA, partyB) {
    // Deterministic mock based on names
    const pairKey = [partyA, partyB].sort().join('-');
    const hash = this._hashString(pairKey);
    
    // Some pairs have a history of conflicts
    const conflictHistoryCount = (hash % 5);
    const averageResolutionTime = ((hash % 8) + 1) + 0.5; // 1.5 to 8.5 hours
    
    return {
      pair: `${partyA} & ${partyB}`,
      pastConflicts: conflictHistoryCount,
      averageResolutionTime: `${averageResolutionTime}h`,
      relationshipStatus: conflictHistoryCount > 2 ? "Friction High" : "Collaborative",
      recommendation: conflictHistoryCount > 2 ? "Suggest pair programming or sync meeting" : "Asynchronous resolution is likely safe"
    };
  }

  _analyzeTeamDynamics(repoName) {
    const hash = this._hashString(repoName);
    const teams = ["Core Banking", "Security & Ops", "Frontend UX", "Platform Infra"];
    const owningTeam = teams[hash % teams.length];
    const conflictingTeam = teams[(hash + 1) % teams.length];

    return {
      owningTeam: owningTeam,
      repeatedlyConflictsWith: [conflictingTeam],
      teamFrictionScore: (hash % 100)
    };
  }

  _analyzeHotspots(repoName, files) {
    if (!files || files.length === 0) return [];

    return files.map(file => {
      const hash = this._hashString(repoName + file);
      const isHotspot = (hash % 3) === 0;
      
      if (isHotspot) {
        return {
          file: file,
          isHotspot: true,
          averageResolutionTime: `${((hash % 5) + 2)}h`,
          previousBreaks: hash % 4
        };
      } else {
        return {
          file: file,
          isHotspot: false
        };
      }
    });
  }

  _hashString(str) {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

module.exports = new RelationshipGraph();
