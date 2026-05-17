/**
 * AI Reasoning Layer
 * Uses watsonx.ai Granite model to analyze conflicts and provide intelligent recommendations
 * 
 * This is NOT just "suggest a fix" - it's an engineering advisor that:
 * - Explains WHY conflicts exist
 * - Assesses technical risk
 * - Recommends multiple resolution strategies
 * - Routes to appropriate team members
 */

require('dotenv').config();
const { WatsonXAI } = require('@ibm-cloud/watsonx-ai');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

// Initialize watsonx.ai client
let watsonxAI = null;

function initializeWatsonX() {
  if (!watsonxAI) {
    const authenticator = new IamAuthenticator({
      apikey: process.env.WATSONX_API_KEY,
    });
    
    watsonxAI = WatsonXAI.newInstance({
      version: '2024-05-31',
      authenticator: authenticator,
      serviceUrl: process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
    });
  }
  return watsonxAI;
}

/**
 * Main AI reasoning function
 * Analyzes enriched context and provides structured engineering advice
 */
async function reasonAboutConflict(enrichedContext) {
  console.log(`AI analyzing conflict: ${enrichedContext.conflict_id}`);
  
  // Check if watsonx.ai is configured
  if (!process.env.WATSONX_API_KEY || !process.env.WATSONX_PROJECT_ID) {
    console.warn('watsonx.ai not configured, using fallback reasoning');
    return buildFallbackReasoning(enrichedContext);
  }
  
  try {
    const client = initializeWatsonX();
    const prompt = buildReasoningPrompt(enrichedContext);
    
    console.log('Calling watsonx.ai Granite model...');
    const startTime = Date.now();
    
    const response = await client.generateText({
      input: prompt,
      modelId: 'ibm/granite-3-8b-instruct',
      projectId: process.env.WATSONX_PROJECT_ID,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.2, // Lower for more deterministic reasoning
        top_p: 0.85,
        repetition_penalty: 1.1
      }
    });

    const duration = Date.now() - startTime;
    console.log(`AI reasoning completed in ${duration}ms`);
    console.log(`Tokens used: ${response.result.input_token_count + response.result.generated_token_count}`);
    
    const aiOutput = response.result.generated_text;
    const parsed = parseAIReasoning(aiOutput, enrichedContext);
    
    // Add token usage metadata
    parsed.token_usage = {
      input_tokens: response.result.input_token_count,
      generated_tokens: response.result.generated_token_count,
      total_tokens: response.result.input_token_count + response.result.generated_token_count,
      duration_ms: duration
    };
    
    return parsed;
    
  } catch (error) {
    console.error('AI Reasoning Error:', error.message);
    
    // Provide helpful error context
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('Check your WATSONX_API_KEY');
    } else if (error.message.includes('404')) {
      console.error('Check your WATSONX_PROJECT_ID');
    }
    
    // Always return fallback reasoning
    return buildFallbackReasoning(enrichedContext);
  }
}

/**
 * Build comprehensive prompt for AI reasoning
 */
function buildReasoningPrompt(context) {
  return `You are a senior software engineering advisor analyzing a code conflict between two pull requests.

**REPOSITORY CONTEXT:**
Language: ${context.repo_context?.language || 'Unknown'}
Repository: ${context.pr_a.author}'s team project
Default Branch: ${context.repo_context?.default_branch || 'main'}

**PULL REQUEST A:**
PR #${context.pr_a.number}: "${context.pr_a.title}"
Author: ${context.pr_a.author}
Branch: ${context.pr_a.branch}

**PULL REQUEST B:**
PR #${context.pr_b.number}: "${context.pr_b.title}"
Author: ${context.pr_b.author}
Branch: ${context.pr_b.branch}

**OVERLAPPING FILES:**
${context.overlapping_files.join('\n')}

**CONFLICT ANALYSIS:**
Risk Level: ${context.risk_level}
Conflict Intensity: ${context.diff_summary?.conflict_intensity || 'Unknown'}
Files Modified by Both: ${context.diff_summary?.both_modified_count || 0}

**DEPENDENCY SIGNALS:**
Core Module: ${context.dependency_signals?.is_core_module ? 'YES' : 'NO'}
API Endpoint: ${context.dependency_signals?.is_api_endpoint ? 'YES' : 'NO'}
Database Layer: ${context.dependency_signals?.is_database_layer ? 'YES' : 'NO'}
Dependency Risk: ${context.dependency_signals?.dependency_risk || 'unknown'}
Risk Areas: ${context.dependency_signals?.risk_areas?.join(', ') || 'none identified'}

**HISTORICAL PATTERNS:**
Conflict Frequency: ${context.historical_patterns?.conflict_frequency || 'unknown'}
Typical Resolution Time: ${context.historical_patterns?.typical_resolution_time || 'unknown'}
Success Rate: ${(context.historical_patterns?.resolution_success_rate * 100 || 85).toFixed(0)}%

**RELATIONSHIP INTELLIGENCE:**
Developer Dynamics: ${context.relationship_graph?.developers?.relationshipStatus || 'unknown'}
Team Friction: ${context.relationship_graph?.teams?.teamFrictionScore || 0}
Hotspots involved: ${context.relationship_graph?.hotspots?.filter(h => h.isHotspot).map(h => h.file).join(', ') || 'none'}
Friction Summary: ${context.relationship_graph?.summary || 'none'}

**YOUR TASK:**
Provide structured engineering reasoning in JSON format. Be specific and technical.

{
  "conflict_explanation": "Clear, technical explanation of WHY this conflict exists and what makes it risky. Reference specific files and technical concerns.",
  "risk_assessment": {
    "level": "high|medium|low",
    "reasoning": "Technical justification for the risk level based on the context provided",
    "impact_areas": ["specific area 1", "specific area 2"],
    "confidence": 0.85
  },
  "resolution_options": [
    {
      "strategy": "Sequential Merge",
      "description": "Specific steps: Merge PR #${context.pr_a.number} first, then ${context.pr_b.author} rebases PR #${context.pr_b.number}",
      "pros": "Clear order prevents conflicts, easier to track changes",
      "cons": "Requires coordination timing, ${context.pr_b.author} must handle rebase",
      "effort": "medium",
      "recommended_for": "When PRs have clear dependency order"
    },
    {
      "strategy": "Joint Review Session",
      "description": "${context.pr_a.author} and ${context.pr_b.author} review changes together in real-time",
      "pros": "Ensures alignment, catches logic conflicts early, builds team knowledge",
      "cons": "Requires scheduling, takes more time upfront",
      "effort": "high",
      "recommended_for": "High-risk conflicts in core modules"
    },
    {
      "strategy": "Refactor Shared Code",
      "description": "Extract overlapping logic into a shared module or utility",
      "pros": "Prevents future conflicts, improves code organization",
      "cons": "More upfront work, requires additional PR",
      "effort": "high",
      "recommended_for": "Recurring conflicts in same files"
    }
  ],
  "recommended_owner": "${context.team_context?.lead || context.pr_a.author}",
  "recommended_reviewers": ["${context.pr_a.author}", "${context.pr_b.author}"],
  "confidence": 0.85
}

Focus on ENGINEERING REASONING based on the technical context provided. Be specific about files, risks, and actions.`;
}

/**
 * Parse AI response into structured format
 */
function parseAIReasoning(aiText, context) {
  try {
    // Try to extract JSON from AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and enrich the parsed response
      return {
        conflict_explanation: parsed.conflict_explanation || 
          'Both PRs modify the same files, creating potential merge conflicts.',
        
        risk_assessment: {
          level: (parsed.risk_assessment?.level || context.risk_level || 'medium').toLowerCase(),
          reasoning: parsed.risk_assessment?.reasoning || 
            'Overlapping changes require coordination to prevent conflicts.',
          impact_areas: parsed.risk_assessment?.impact_areas || 
            context.dependency_signals?.risk_areas || ['code-quality'],
          confidence: parsed.risk_assessment?.confidence || 0.80
        },
        
        resolution_options: parsed.resolution_options || 
          buildDefaultOptions(context),
        
        recommended_owner: parsed.recommended_owner || 
          context.team_context?.lead || 
          context.pr_a.author,
        
        recommended_reviewers: parsed.recommended_reviewers || 
          [context.pr_a.author, context.pr_b.author],
        
        confidence: parsed.confidence || 0.80,
        
        // Metadata
        raw_reasoning: aiText,
        context_used: {
          files_analyzed: context.overlapping_files.length,
          diff_intensity: context.diff_summary?.conflict_intensity || 0,
          is_core_module: context.dependency_signals?.is_core_module || false,
          dependency_risk: context.dependency_signals?.dependency_risk || 'unknown'
        },
        relationship_insights: context.relationship_graph,
        ai_generated: true,
        fallback_used: false
      };
    }
  } catch (e) {
    console.error('JSON parse error:', e.message);
  }
  
  // Fallback: structured extraction from text
  return {
    conflict_explanation: extractSection(aiText, 'conflict_explanation') || 
      buildDefaultExplanation(context),
    
    risk_assessment: {
      level: context.risk_level?.toLowerCase() || 'medium',
      reasoning: extractSection(aiText, 'reasoning') || 
        'Overlapping changes detected in critical files',
      impact_areas: context.dependency_signals?.risk_areas || ['code-quality'],
      confidence: 0.75
    },
    
    resolution_options: extractOptions(aiText) || buildDefaultOptions(context),
    
    recommended_owner: context.team_context?.lead || context.pr_a.author,
    recommended_reviewers: [context.pr_a.author, context.pr_b.author],
    confidence: 0.75,
    
    raw_reasoning: aiText,
    context_used: {
      files_analyzed: context.overlapping_files.length,
      diff_intensity: context.diff_summary?.conflict_intensity || 0,
      is_core_module: context.dependency_signals?.is_core_module || false
    },
    relationship_insights: context.relationship_graph,
    ai_generated: true,
    fallback_used: false,
    parsing_fallback: true
  };
}

/**
 * Extract section from AI text response
 */
function extractSection(text, sectionName) {
  const patterns = [
    new RegExp(`"${sectionName}"\\s*:\\s*"([^"]*)"`, 'i'),
    new RegExp(`${sectionName}[:\\s]+([^\\n]+)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Extract resolution options from text
 */
function extractOptions(text) {
  const optionsMatch = text.match(/"resolution_options"\s*:\s*\[([\s\S]*?)\]/);
  if (optionsMatch) {
    try {
      return JSON.parse(`[${optionsMatch[1]}]`);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Build default explanation based on context
 */
function buildDefaultExplanation(context) {
  let explanation = `Both PRs modify ${context.overlapping_files.join(', ')}. `;
  
  if (context.dependency_signals?.is_core_module) {
    explanation += 'These are core system files, making conflicts particularly risky. ';
  }
  
  if (context.dependency_signals?.is_database_layer) {
    explanation += 'Database schema changes require careful coordination to prevent data issues. ';
  }
  
  if (context.diff_summary?.conflict_intensity > 100) {
    explanation += 'High change volume increases the likelihood of merge conflicts. ';
  }
  
  return explanation.trim();
}

/**
 * Build default resolution options
 */
function buildDefaultOptions(context) {
  return [
    {
      strategy: "Sequential Merge",
      description: `Merge PR #${context.pr_a.number} first, then ${context.pr_b.author} rebases PR #${context.pr_b.number} on the updated branch`,
      pros: "Clear order prevents conflicts, easier to track changes, maintains clean history",
      cons: `Requires coordination timing, ${context.pr_b.author} must handle rebase conflicts`,
      effort: "medium",
      recommended_for: "When PRs have clear dependency order or one is more critical"
    },
    {
      strategy: "Joint Review Session",
      description: `${context.pr_a.author} and ${context.pr_b.author} review changes together in a synchronous session`,
      pros: "Ensures alignment, catches logic conflicts early, builds team knowledge, reduces back-and-forth",
      cons: "Requires scheduling, takes more time upfront, needs both authors available",
      effort: "high",
      recommended_for: context.dependency_signals?.is_core_module ? 
        "High-risk conflicts in core modules like authentication or payments" :
        "Medium to high-risk conflicts requiring deep coordination"
    },
    {
      strategy: "Refactor Shared Code",
      description: "Extract overlapping logic into a shared module, utility, or service layer",
      pros: "Prevents future conflicts, improves code organization, reduces coupling, better maintainability",
      cons: "More upfront work, requires additional PR, may need architecture review",
      effort: "high",
      recommended_for: "Recurring conflicts in same files or when code duplication is detected"
    }
  ];
}

/**
 * Build fallback reasoning when AI is unavailable
 */
function buildFallbackReasoning(context) {
  console.log('Using rule-based fallback reasoning');
  
  return {
    conflict_explanation: buildDefaultExplanation(context),
    
    risk_assessment: {
      level: context.risk_level?.toLowerCase() || 'medium',
      reasoning: buildRiskReasoning(context),
      impact_areas: context.dependency_signals?.risk_areas || ['code-quality'],
      confidence: 0.70
    },
    
    resolution_options: buildDefaultOptions(context),
    
    recommended_owner: context.team_context?.lead || context.pr_a.author,
    recommended_reviewers: [context.pr_a.author, context.pr_b.author],
    confidence: 0.70,
    
    context_used: {
      files_analyzed: context.overlapping_files.length,
      diff_intensity: context.diff_summary?.conflict_intensity || 0,
      is_core_module: context.dependency_signals?.is_core_module || false,
      dependency_risk: context.dependency_signals?.dependency_risk || 'unknown'
    },
    
    relationship_insights: context.relationship_graph,
    ai_generated: false,
    fallback_used: true,
    fallback_reason: 'watsonx.ai unavailable or not configured'
  };
}

/**
 * Build risk reasoning based on context
 */
function buildRiskReasoning(context) {
  const reasons = [];
  
  if (context.dependency_signals?.is_core_module) {
    reasons.push('Core module changes affect system-wide functionality');
  }
  
  if (context.dependency_signals?.is_database_layer) {
    reasons.push('Database changes can cause data corruption or migration failures');
  }
  
  if (context.diff_summary?.conflict_intensity > 100) {
    reasons.push('High volume of changes increases merge conflict likelihood');
  }
  
  if (context.diff_summary?.both_modified_count > 0) {
    reasons.push(`${context.diff_summary.both_modified_count} files modified by both PRs`);
  }
  
  if (context.historical_patterns?.conflict_frequency === 'high') {
    reasons.push('These files have a history of frequent conflicts');
  }
  
  return reasons.length > 0 ? 
    reasons.join('. ') + '.' : 
    'Overlapping file changes detected requiring coordination.';
}

module.exports = {
  reasonAboutConflict,
  buildFallbackReasoning
};

// Made with Bob
