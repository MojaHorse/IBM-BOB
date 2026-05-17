/**
 * Simulation Engine - "What If" Predictions
 * 
 * Predicts outcomes of different resolution strategies using:
 * - Historical patterns
 * - Team velocity data
 * - Dependency analysis
 * - Risk propagation models
 */

class SimulationEngine {
  constructor() {
    this.historicalData = {
      avgResolutionTime: {
        low: 2,      // hours
        medium: 8,   // hours
        high: 24     // hours
      },
      successRates: {
        'coordinate-first': 0.85,
        'merge-sequential': 0.75,
        'refactor-common': 0.90,
        'split-work': 0.80,
        'rebase-strategy': 0.70
      },
      teamVelocity: {
        'Frontend Team': 1.2,
        'Backend Team': 1.0,
        'DevOps Team': 0.9,
        'Data Team': 1.1
      }
    };
  }

  /**
   * Simulate a resolution strategy
   */
  async simulateStrategy(conflict, strategy, context) {
    const simulation = {
      strategy: strategy.strategy,
      timestamp: new Date().toISOString(),
      predictions: {},
      risks: [],
      timeline: [],
      confidence: 0
    };

    // Predict success probability
    simulation.predictions.successProbability = this.predictSuccessProbability(
      conflict,
      strategy,
      context
    );

    // Predict time to resolution
    simulation.predictions.timeToResolution = this.predictResolutionTime(
      conflict,
      strategy,
      context
    );

    // Predict downstream impacts
    simulation.predictions.downstreamImpacts = this.predictDownstreamImpacts(
      conflict,
      strategy,
      context
    );

    // Predict team impact
    simulation.predictions.teamImpact = this.predictTeamImpact(
      conflict,
      strategy,
      context
    );

    // Identify risks
    simulation.risks = this.identifyRisks(conflict, strategy, context);

    // Generate timeline
    simulation.timeline = this.generateTimeline(conflict, strategy, context);

    // Calculate overall confidence
    simulation.confidence = this.calculateSimulationConfidence(
      conflict,
      strategy,
      context
    );

    return simulation;
  }

  /**
   * Predict success probability (0-1)
   */
  predictSuccessProbability(conflict, strategy, context) {
    let baseRate = this.historicalData.successRates[strategy.strategy] || 0.75;
    
    // Adjust based on conflict complexity
    const complexityFactor = this.getComplexityFactor(conflict, context);
    baseRate *= complexityFactor;

    // Adjust based on team experience
    const teamFactor = this.getTeamExperienceFactor(context);
    baseRate *= teamFactor;

    // Adjust based on dependency risk
    const dependencyFactor = this.getDependencyFactor(context);
    baseRate *= dependencyFactor;

    // Adjust based on relationship intelligence
    const relationshipFactor = this.getRelationshipFactor(context);
    baseRate *= relationshipFactor;

    // Clamp between 0.3 and 0.95
    return Math.max(0.3, Math.min(0.95, baseRate));
  }

  /**
   * Predict time to resolution in hours
   */
  predictResolutionTime(conflict, strategy, context) {
    const riskLevel = conflict.riskLevel?.toLowerCase() || 'medium';
    let baseTime = this.historicalData.avgResolutionTime[riskLevel] || 8;

    // Adjust based on hotspots
    if (context.relationship_graph && context.relationship_graph.hotspots) {
      const isHotspot = context.relationship_graph.hotspots.some(h => h.isHotspot);
      if (isHotspot) {
        baseTime *= 1.5; // 50% penalty for touching a hotspot
      }
    }

    // Developer friction time penalty
    if (context.relationship_graph?.developers?.relationshipStatus === 'Friction High') {
      baseTime += 4; // Add 4 hours for coordination overhead
    }

    // Adjust based on strategy effort
    const effortMultiplier = {
      'Low': 0.7,
      'Medium': 1.0,
      'High': 1.5
    };
    baseTime *= effortMultiplier[strategy.effort] || 1.0;

    // Adjust based on team velocity
    const team = context.team?.name || 'Backend Team';
    const velocity = this.historicalData.teamVelocity[team] || 1.0;
    baseTime /= velocity;

    // Adjust based on number of files
    const fileCount = conflict.overlappingFiles?.length || 1;
    baseTime *= Math.log2(fileCount + 1);

    return {
      optimistic: Math.round(baseTime * 0.6),
      realistic: Math.round(baseTime),
      pessimistic: Math.round(baseTime * 1.8),
      unit: 'hours'
    };
  }

  /**
   * Predict downstream impacts
   */
  predictDownstreamImpacts(conflict, strategy, context) {
    const impacts = [];

    // Check for dependent PRs
    if (context.dependencies?.dependentPRs > 0) {
      impacts.push({
        type: 'blocked_prs',
        severity: 'high',
        count: context.dependencies.dependentPRs,
        description: `${context.dependencies.dependentPRs} PR(s) blocked until resolution`,
        estimatedDelay: this.predictResolutionTime(conflict, strategy, context).realistic
      });
    }

    // Check for API changes
    if (context.dependencies?.signals?.includes('api_endpoint_modified')) {
      impacts.push({
        type: 'api_consumers',
        severity: 'medium',
        description: 'API consumers may need updates',
        affectedServices: ['Frontend', 'Mobile App', 'Third-party integrations'],
        estimatedEffort: 'Medium'
      });
    }

    // Check for database changes
    if (context.dependencies?.signals?.includes('database_schema_modified')) {
      impacts.push({
        type: 'database_migration',
        severity: 'high',
        description: 'Database migration required',
        requiresDowntime: true,
        estimatedDowntime: '5-15 minutes'
      });
    }

    // Check for test coverage
    if (context.repository?.language === 'JavaScript' || context.repository?.language === 'TypeScript') {
      impacts.push({
        type: 'test_updates',
        severity: 'low',
        description: 'Unit tests may need updates',
        estimatedEffort: 'Low'
      });
    }

    return impacts;
  }

  /**
   * Predict team impact
   */
  predictTeamImpact(conflict, strategy, context) {
    const team = context.team?.name || 'Unknown Team';
    const velocity = this.historicalData.teamVelocity[team] || 1.0;
    const resolutionTime = this.predictResolutionTime(conflict, strategy, context);

    return {
      team: team,
      developersAffected: 2, // Both PR authors
      estimatedCapacityImpact: `${Math.round(resolutionTime.realistic / 8 * 100)}% of a sprint day`,
      velocityImpact: velocity < 1.0 ? 'negative' : 'neutral',
      recommendedApproach: strategy.strategy === 'coordinate-first' 
        ? 'Schedule sync meeting within 24 hours'
        : 'Async coordination via PR comments',
      parallelWorkPossible: strategy.strategy === 'split-work'
    };
  }

  /**
   * Identify potential risks
   */
  identifyRisks(conflict, strategy, context) {
    const risks = [];

    // Risk: Organizational friction
    if (context.relationship_graph?.teams?.teamFrictionScore > 75) {
      risks.push({
        type: 'organizational_friction',
        probability: 0.8,
        severity: 'medium',
        description: `High friction (${context.relationship_graph.teams.teamFrictionScore}/100) detected between teams`,
        mitigation: 'Involve team leads early in the resolution process'
      });
    }

    // Risk: Hotspot modification
    if (context.relationship_graph?.hotspots?.some(h => h.isHotspot)) {
      risks.push({
        type: 'hotspot_regression',
        probability: 0.6,
        severity: 'high',
        description: 'Changes touch historical bug hotspots. High risk of regression.',
        mitigation: 'Require additional QA pass and extended automated testing'
      });
    }

    // Risk: Merge conflicts
    if (conflict.overlappingFiles?.length > 3) {
      risks.push({
        type: 'merge_conflicts',
        probability: 0.7,
        severity: 'medium',
        description: 'High likelihood of merge conflicts due to multiple overlapping files',
        mitigation: 'Use git rerere or coordinate merge order'
      });
    }

    // Risk: Breaking changes
    if (context.dependencies?.signals?.includes('core_module_modified')) {
      risks.push({
        type: 'breaking_changes',
        probability: 0.5,
        severity: 'high',
        description: 'Core module changes may break dependent code',
        mitigation: 'Run full test suite before merging'
      });
    }

    // Risk: Communication breakdown
    if (strategy.strategy === 'coordinate-first' && context.team?.size > 5) {
      risks.push({
        type: 'communication_overhead',
        probability: 0.4,
        severity: 'low',
        description: 'Large team may have coordination challenges',
        mitigation: 'Designate a single point of contact'
      });
    }

    // Risk: Delayed resolution
    const resolutionTime = this.predictResolutionTime(conflict, strategy, context);
    if (resolutionTime.pessimistic > 48) {
      risks.push({
        type: 'delayed_resolution',
        probability: 0.3,
        severity: 'medium',
        description: 'Resolution may take longer than expected',
        mitigation: 'Set intermediate checkpoints and deadlines'
      });
    }

    return risks;
  }

  /**
   * Generate resolution timeline
   */
  generateTimeline(conflict, strategy, context) {
    const resolutionTime = this.predictResolutionTime(conflict, strategy, context);
    const now = new Date();
    const timeline = [];

    // Immediate actions (0-2 hours)
    timeline.push({
      phase: 'immediate',
      timeRange: '0-2 hours',
      timestamp: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      actions: [
        'Notify affected developers',
        'Create coordination issue',
        'Review conflict details'
      ],
      status: 'pending'
    });

    // Short-term actions (2-8 hours)
    if (resolutionTime.realistic > 2) {
      timeline.push({
        phase: 'short-term',
        timeRange: '2-8 hours',
        timestamp: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        actions: [
          strategy.strategy === 'coordinate-first' 
            ? 'Hold sync meeting'
            : 'Begin async coordination',
          'Agree on resolution approach',
          'Update PR descriptions'
        ],
        status: 'pending'
      });
    }

    // Medium-term actions (8-24 hours)
    if (resolutionTime.realistic > 8) {
      timeline.push({
        phase: 'medium-term',
        timeRange: '8-24 hours',
        timestamp: new Date(now.getTime() + 16 * 60 * 60 * 1000).toISOString(),
        actions: [
          'Implement agreed changes',
          'Update tests',
          'Request code review'
        ],
        status: 'pending'
      });
    }

    // Long-term actions (24+ hours)
    if (resolutionTime.realistic > 24) {
      timeline.push({
        phase: 'long-term',
        timeRange: '24+ hours',
        timestamp: new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString(),
        actions: [
          'Final review and approval',
          'Merge PRs in sequence',
          'Monitor for issues'
        ],
        status: 'pending'
      });
    }

    // Resolution complete
    timeline.push({
      phase: 'complete',
      timeRange: `~${resolutionTime.realistic} hours`,
      timestamp: new Date(now.getTime() + resolutionTime.realistic * 60 * 60 * 1000).toISOString(),
      actions: [
        'Conflict resolved',
        'Update documentation',
        'Close coordination issue'
      ],
      status: 'pending'
    });

    return timeline;
  }

  /**
   * Helper: Get complexity factor
   */
  getComplexityFactor(conflict, context) {
    let factor = 1.0;
    
    // More files = more complex
    const fileCount = conflict.overlappingFiles?.length || 1;
    if (fileCount > 5) factor *= 0.8;
    else if (fileCount > 3) factor *= 0.9;

    // Core modules = more complex
    if (context.dependencies?.signals?.includes('core_module_modified')) {
      factor *= 0.85;
    }

    return factor;
  }

  /**
   * Helper: Get team experience factor
   */
  getTeamExperienceFactor(context) {
    const team = context.team?.name || 'Unknown Team';
    const velocity = this.historicalData.teamVelocity[team] || 1.0;
    
    // Higher velocity = more experience = higher success rate
    return 0.8 + (velocity * 0.2);
  }

  /**
   * Helper: Get dependency factor
   */
  getDependencyFactor(context) {
    const riskScore = context.dependencies?.dependencyRisk || 0;
    
    // Higher risk = lower success probability
    return 1.0 - (riskScore / 200); // Normalize to 0.5-1.0 range
  }

  /**
   * Helper: Get relationship factor based on dev dynamics and team friction
   */
  getRelationshipFactor(context) {
    let factor = 1.0;
    if (!context.relationship_graph) return factor;
    
    // High friction between developers lowers success probability
    if (context.relationship_graph.developers?.relationshipStatus === 'Friction High') {
      factor *= 0.85; 
    } else {
      factor *= 1.1; // Collaborative boost
    }

    // High team friction between owning and conflicting teams lowers probability
    const teamFriction = context.relationship_graph.teams?.teamFrictionScore || 0;
    if (teamFriction > 50) {
      factor *= (1 - ((teamFriction - 50) / 200)); // slight penalty
    }

    return factor;
  }

  /**
   * Calculate simulation confidence
   */
  calculateSimulationConfidence(conflict, strategy, context) {
    let confidence = 0.7; // Base confidence

    // More historical data = higher confidence
    if (this.historicalData.successRates[strategy.strategy]) {
      confidence += 0.1;
    }

    // More context = higher confidence
    if (context.dependencies && context.team && context.repository) {
      confidence += 0.1;
    }

    // Recent conflicts = higher confidence
    if (context.historical?.recentConflicts > 5) {
      confidence += 0.05;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Compare multiple strategies
   */
  async compareStrategies(conflict, strategies, context) {
    const comparisons = [];

    for (const strategy of strategies) {
      const simulation = await this.simulateStrategy(conflict, strategy, context);
      comparisons.push({
        strategy: strategy.strategy,
        score: this.calculateStrategyScore(simulation),
        simulation
      });
    }

    // Sort by score (highest first)
    comparisons.sort((a, b) => b.score - a.score);

    return {
      recommended: comparisons[0],
      alternatives: comparisons.slice(1),
      comparisonMatrix: this.buildComparisonMatrix(comparisons)
    };
  }

  /**
   * Calculate strategy score (0-100)
   */
  calculateStrategyScore(simulation) {
    const weights = {
      successProbability: 0.4,
      timeEfficiency: 0.3,
      riskLevel: 0.2,
      teamImpact: 0.1
    };

    const successScore = simulation.predictions.successProbability * 100;
    
    // Time efficiency (faster = better, normalized to 0-100)
    const timeScore = Math.max(0, 100 - (simulation.predictions.timeToResolution.realistic * 2));
    
    // Risk level (fewer/lower risks = better)
    const riskScore = Math.max(0, 100 - (simulation.risks.length * 15));
    
    // Team impact (lower impact = better)
    const teamScore = simulation.predictions.teamImpact.parallelWorkPossible ? 90 : 70;

    return (
      successScore * weights.successProbability +
      timeScore * weights.timeEfficiency +
      riskScore * weights.riskLevel +
      teamScore * weights.teamImpact
    );
  }

  /**
   * Build comparison matrix
   */
  buildComparisonMatrix(comparisons) {
    return {
      strategies: comparisons.map(c => c.strategy),
      metrics: {
        successProbability: comparisons.map(c => c.simulation.predictions.successProbability),
        timeToResolution: comparisons.map(c => c.simulation.predictions.timeToResolution.realistic),
        riskCount: comparisons.map(c => c.simulation.risks.length),
        overallScore: comparisons.map(c => c.score)
      }
    };
  }
}

module.exports = new SimulationEngine();

// Made with Bob
