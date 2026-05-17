/**
 * Decision Layer
 * AI recommends, system decides, human confirms
 * 
 * This prevents "black box automation" by:
 * - Evaluating AI recommendations
 * - Determining approval requirements
 * - Calculating urgency levels
 * - Routing to appropriate stakeholders
 */

/**
 * Make decision based on AI reasoning and conflict context
 * @param {Object} aiReasoning - AI analysis results
 * @param {Object} conflict - Original conflict data
 * @param {Object} userPreferences - Optional user preferences
 * @returns {Object} Decision with recommended actions
 */
function makeDecision(aiReasoning, conflict, userPreferences = {}) {
  const decision = {
    conflict_id: conflict.id,
    timestamp: new Date().toISOString(),
    
    // AI Insights
    ai_explanation: aiReasoning.conflict_explanation,
    ai_risk_level: aiReasoning.risk_assessment.level,
    ai_confidence: aiReasoning.confidence,
    ai_impact_areas: aiReasoning.risk_assessment.impact_areas,
    
    // System Decision
    recommended_action: determineRecommendedAction(aiReasoning, conflict),
    requires_approval: shouldRequireApproval(aiReasoning, conflict),
    urgency: calculateUrgency(aiReasoning, conflict),
    priority: calculatePriority(aiReasoning, conflict),
    
    // Resolution Options (for human choice)
    resolution_options: aiReasoning.resolution_options,
    preferred_option: selectPreferredOption(aiReasoning.resolution_options, aiReasoning, conflict),
    
    // Routing
    assigned_to: aiReasoning.recommended_owner,
    reviewers: aiReasoning.recommended_reviewers,
    notify_team: determineTeamNotification(aiReasoning, conflict),
    
    // Execution Plan
    execution_plan: buildExecutionPlan(aiReasoning, conflict),
    estimated_resolution_time: aiReasoning.risk_assessment.level === 'high' ? '4-6 hours' :
                                aiReasoning.risk_assessment.level === 'medium' ? '2-3 hours' : '1-2 hours',
    
    // Metadata
    context_quality: aiReasoning.context_used ? 'high' : 'medium',
    is_ai_generated: aiReasoning.ai_generated || false,
    fallback_used: aiReasoning.fallback_used || false,
    decision_confidence: calculateDecisionConfidence(aiReasoning, conflict)
  };
  
  return decision;
}

/**
 * Determine recommended action based on AI analysis
 */
function determineRecommendedAction(aiReasoning, conflict) {
  const riskLevel = aiReasoning.risk_assessment.level;
  const confidence = aiReasoning.confidence;
  const isCoreModule = aiReasoning.context_used?.is_core_module;
  
  // High risk or low confidence = manual review required
  if (riskLevel === 'high' || confidence < 0.7) {
    return {
      type: 'manual_review',
      description: 'High risk or low AI confidence - requires human review and decision',
      auto_executable: false,
      reason: riskLevel === 'high' ? 
        'High-risk conflict in critical system components' : 
        'AI confidence below threshold for automated action'
    };
  }
  
  // Core modules always need approval
  if (isCoreModule) {
    return {
      type: 'guided_resolution',
      description: 'Post coordination comment on both PRs with AI-suggested resolution strategies',
      auto_executable: true,
      requires_approval: true,
      reason: 'Core module changes require team lead approval before posting guidance'
    };
  }
  
  // Medium risk with good confidence = guided resolution
  if (riskLevel === 'medium' && confidence >= 0.8) {
    return {
      type: 'guided_resolution',
      description: 'Post coordination comment with AI recommendations',
      auto_executable: true,
      requires_approval: true,
      reason: 'Medium risk - post guidance after approval'
    };
  }
  
  // Low risk = monitor and notify
  return {
    type: 'monitor_and_notify',
    description: 'Notify authors of potential conflict and monitor resolution',
    auto_executable: true,
    requires_approval: false,
    reason: 'Low risk - authors can coordinate directly'
  };
}

/**
 * Determine if approval is required
 */
function shouldRequireApproval(aiReasoning, conflict) {
  // Always require approval for:
  // 1. High risk conflicts
  if (aiReasoning.risk_assessment.level === 'high') {
    return {
      required: true,
      reason: 'High-risk conflict',
      approver: conflict.parties?.ownerTeam ? `${conflict.parties.ownerTeam} Lead` : 'Team Lead'
    };
  }
  
  // 2. Core module changes
  if (aiReasoning.context_used?.is_core_module) {
    return {
      required: true,
      reason: 'Core module modification',
      approver: 'Security Team Lead'
    };
  }
  
  // 3. Database layer changes
  if (aiReasoning.context_used?.dependency_risk === 'high') {
    return {
      required: true,
      reason: 'High dependency risk',
      approver: 'Architecture Lead'
    };
  }
  
  // 4. Low AI confidence
  if (aiReasoning.confidence < 0.75) {
    return {
      required: true,
      reason: 'Low AI confidence - human verification needed',
      approver: 'Team Lead'
    };
  }
  
  // No approval required for low-risk, high-confidence scenarios
  return {
    required: false,
    reason: 'Low risk and high confidence',
    approver: null
  };
}

/**
 * Calculate urgency level
 */
function calculateUrgency(aiReasoning, conflict) {
  const riskLevel = aiReasoning.risk_assessment.level;
  const impactAreas = aiReasoning.risk_assessment.impact_areas || [];
  
  // Critical: High risk + security/auth/payments
  if (riskLevel === 'high' && 
      (impactAreas.includes('authentication') || 
       impactAreas.includes('security') ||
       impactAreas.includes('payments'))) {
    return {
      level: 'critical',
      sla: '2 hours',
      escalation: 'Immediate team lead notification',
      reason: 'High-risk conflict in critical security/payment systems'
    };
  }
  
  // High: High risk conflicts
  if (riskLevel === 'high') {
    return {
      level: 'high',
      sla: '4 hours',
      escalation: 'Team lead notification if not addressed in 2 hours',
      reason: 'High-risk conflict requires prompt attention'
    };
  }
  
  // Medium: Medium risk or core modules
  if (riskLevel === 'medium' || aiReasoning.context_used?.is_core_module) {
    return {
      level: 'medium',
      sla: '8 hours',
      escalation: 'Team notification if not addressed in 4 hours',
      reason: 'Medium-risk conflict or core module changes'
    };
  }
  
  // Low: Everything else
  return {
    level: 'low',
    sla: '24 hours',
    escalation: 'None',
    reason: 'Low-risk conflict - normal coordination process'
  };
}

/**
 * Calculate priority score (0-100)
 */
function calculatePriority(aiReasoning, conflict) {
  let score = 50; // Base score
  
  // Risk level impact
  if (aiReasoning.risk_assessment.level === 'high') score += 30;
  else if (aiReasoning.risk_assessment.level === 'medium') score += 15;
  
  // Core module impact
  if (aiReasoning.context_used?.is_core_module) score += 20;
  
  // Dependency risk
  if (aiReasoning.context_used?.dependency_risk === 'high') score += 15;
  else if (aiReasoning.context_used?.dependency_risk === 'medium') score += 8;
  
  // Conflict intensity
  const intensity = aiReasoning.context_used?.diff_intensity || 0;
  if (intensity > 150) score += 10;
  else if (intensity > 75) score += 5;
  
  // AI confidence (lower confidence = higher priority for review)
  if (aiReasoning.confidence < 0.7) score += 10;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Select preferred resolution option
 */
function selectPreferredOption(options, aiReasoning, conflict) {
  if (!options || options.length === 0) return null;
  
  const riskLevel = aiReasoning.risk_assessment.level;
  
  // High risk: prefer joint review
  if (riskLevel === 'high') {
    const jointReview = options.find(opt => 
      opt.strategy.toLowerCase().includes('joint') || 
      opt.strategy.toLowerCase().includes('review')
    );
    if (jointReview) return jointReview;
  }
  
  // Medium risk: prefer sequential merge
  if (riskLevel === 'medium') {
    const sequential = options.find(opt => 
      opt.strategy.toLowerCase().includes('sequential')
    );
    if (sequential) return sequential;
  }
  
  // Default: first option
  return options[0];
}

/**
 * Determine team notification strategy
 */
function determineTeamNotification(aiReasoning, conflict) {
  const urgency = calculateUrgency(aiReasoning, conflict);
  
  return {
    notify_authors: true,
    notify_reviewers: aiReasoning.risk_assessment.level !== 'low',
    notify_team_lead: urgency.level === 'critical' || urgency.level === 'high',
    notify_team_channel: urgency.level === 'critical',
    notification_message: buildNotificationMessage(aiReasoning, conflict, urgency)
  };
}

/**
 * Build notification message
 */
function buildNotificationMessage(aiReasoning, conflict, urgency) {
  return {
    title: `${urgency.level.toUpperCase()} Priority: Conflict Detected`,
    summary: aiReasoning.conflict_explanation,
    action_required: urgency.level === 'critical' || urgency.level === 'high' ? 
      'Immediate coordination required' : 
      'Please coordinate before merging',
    sla: urgency.sla
  };
}

/**
 * Build execution plan
 */
function buildExecutionPlan(aiReasoning, conflict) {
  const steps = [];
  
  // Step 1: Notify stakeholders
  steps.push({
    step: 1,
    action: 'notify_stakeholders',
    description: `Notify ${conflict.parties.authorA.name} and ${conflict.parties.authorB.name} of conflict`,
    status: 'pending',
    automated: true
  });
  
  // Step 2: Approval (if required)
  const approval = shouldRequireApproval(aiReasoning, conflict);
  if (approval.required) {
    steps.push({
      step: 2,
      action: 'request_approval',
      description: `Request approval from ${approval.approver}`,
      status: 'pending',
      automated: true
    });
  }
  
  // Step 3: Post guidance
  steps.push({
    step: approval.required ? 3 : 2,
    action: 'post_guidance',
    description: 'Post AI-generated resolution guidance on both PRs',
    status: 'pending',
    automated: true,
    requires_approval: approval.required
  });
  
  // Step 4: Monitor resolution
  steps.push({
    step: approval.required ? 4 : 3,
    action: 'monitor_resolution',
    description: 'Track resolution progress and update status',
    status: 'pending',
    automated: true
  });
  
  return {
    steps,
    total_steps: steps.length,
    estimated_duration: aiReasoning.risk_assessment.level === 'high' ? '4-6 hours' :
                       aiReasoning.risk_assessment.level === 'medium' ? '2-3 hours' : '1-2 hours'
  };
}

/**
 * Calculate overall decision confidence
 */
function calculateDecisionConfidence(aiReasoning, conflict) {
  let confidence = aiReasoning.confidence || 0.7;
  
  // Reduce confidence if using fallback
  if (aiReasoning.fallback_used) {
    confidence *= 0.85;
  }
  
  // Reduce confidence if context quality is low
  if (!aiReasoning.context_used || aiReasoning.context_used.files_analyzed === 0) {
    confidence *= 0.9;
  }
  
  // Increase confidence if high-quality context
  if (aiReasoning.context_used?.diff_intensity > 0) {
    confidence = Math.min(0.95, confidence * 1.05);
  }
  
  return Math.round(confidence * 100) / 100;
}

/**
 * Evaluate if decision should be auto-executed
 */
function canAutoExecute(decision) {
  return decision.recommended_action.auto_executable && 
         !decision.requires_approval.required &&
         decision.decision_confidence >= 0.75;
}

/**
 * Generate human-readable decision summary
 */
function generateDecisionSummary(decision) {
  return {
    summary: `${decision.urgency.level.toUpperCase()} priority conflict requiring ${
      decision.requires_approval.required ? 'approval' : 'coordination'
    }`,
    action: decision.recommended_action.description,
    timeline: decision.estimated_resolution_time,
    confidence: `${(decision.decision_confidence * 100).toFixed(0)}%`,
    next_steps: decision.execution_plan.steps
      .filter(s => s.status === 'pending')
      .map(s => s.description)
  };
}

module.exports = {
  makeDecision,
  shouldRequireApproval,
  calculateUrgency,
  calculatePriority,
  canAutoExecute,
  generateDecisionSummary
};

// Made with Bob
