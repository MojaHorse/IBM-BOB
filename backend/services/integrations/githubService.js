const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SENSITIVE_KEYWORDS = ['auth', 'session', 'security', 'payment', 'checkout', 'config', 'middleware', 'routes'];
const DEPENDENCY_FILES = ['package.json', 'package-lock.json', 'yarn.lock', 'requirements.txt', 'Gemfile', 'go.mod'];

// Mock reviewers and teams for the party-aware MVP
const MOCK_REVIEWERS = ['Maya', 'Lebo', 'Zain', 'Priya', 'Alex'];
const MOCK_TEAMS = ['Payments Team', 'Identity Team', 'Frontend Team', 'DevOps Team'];

async function scanRepo(owner, repo, token) {
  const config = {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  };

  try {
    // 1. Fetch Repo Metadata
    const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, config);
    const repoData = repoRes.data;
    const defaultBranch = repoData.default_branch;

    // 2. Simulate Branches and Open PRs dynamically from JSON
    const pullRequestsDataPath = path.join(__dirname, '../data/pullRequests.json');
    const scenarios = JSON.parse(fs.readFileSync(pullRequestsDataPath, 'utf8'));
    
    // Hash the repo name to ensure different repos get different data
    let repoHash = 0;
    for (let i = 0; i < repo.length; i++) {
      repoHash += repo.charCodeAt(i);
    }
    
    const scenarioIndex = repoHash % scenarios.length;
    const { branches, pullsWithFiles: rawPulls } = scenarios[scenarioIndex];
    
    // Inject dynamic data into the raw pulls (like URL and dates)
    const pullsWithFiles = rawPulls.map(pr => ({
      ...pr,
      url: `https://github.com/${owner}/${repo}/pull/${pr.number}`,
      updatedAt: new Date().toISOString()
    }));

    // 5. Detect Overlaps and Score Risk
    const conflicts = [];
    for (let i = 0; i < pullsWithFiles.length; i++) {
      for (let j = i + 1; j < pullsWithFiles.length; j++) {
        const prA = pullsWithFiles[i];
        const prB = pullsWithFiles[j];

        const overlappingFiles = prA.filesChanged.filter(file => prB.filesChanged.includes(file));

        if (overlappingFiles.length > 0) {
          let score = 40; 
          score += (overlappingFiles.length - 1) * 15;

          const hasSensitive = overlappingFiles.some(file => 
            SENSITIVE_KEYWORDS.some(kw => file.toLowerCase().includes(kw))
          );
          if (hasSensitive) score += 20;

          const changesDeps = [...prA.filesChanged, ...prB.filesChanged].some(file => 
            DEPENDENCY_FILES.includes(file)
          );
          if (changesDeps) score += 10;

          let freshnessRisk = false;
          if (prA.commitsBehind > 3 || prB.commitsBehind > 3) {
            score += 10;
            freshnessRisk = true;
          }

          let riskLevel = 'Low';
          if (score >= 60) riskLevel = 'High';
          else if (score >= 30) riskLevel = 'Medium';

          // Party-Aware Layer
          const ownerTeam = MOCK_TEAMS[i % MOCK_TEAMS.length];
          const reviewer = MOCK_REVIEWERS[j % MOCK_REVIEWERS.length];

          conflicts.push({
            id: `${prA.number}-${prB.number}`,
            riskLevel,
            score: Math.min(100, score),
            overlappingFiles,
            explanation: generateExplanation(prA, prB, overlappingFiles, hasSensitive, freshnessRisk),
            suggestedAction: `${prA.author} and ${prB.author} should review ${overlappingFiles[0]} together before merging.`,
            
            // Phase 6: Party-Aware Structure
            parties: {
              authorA: {
                name: prA.author,
                role: "PR Author",
                pr: prA.number,
                branch: prA.branch,
                title: prA.title
              },
              authorB: {
                name: prB.author,
                role: "PR Author",
                pr: prB.number,
                branch: prB.branch,
                title: prB.title
              },
              ownerTeam,
              reviewer,
              approver: `${ownerTeam} Lead`
            },

            recommendations: {
              authors: `${prA.author} and ${prB.author} should align on ${overlappingFiles[0]} changes.`,
              reviewer: `${reviewer} should wait for coordination before final approval.`,
              lead: `${ownerTeam} Lead should verify that the logic collision is addressed.`
            },

            // Phase 6.5: Localized Messages — different message per party
            localizedMessages: {
              authorA: `Heads up — your PR #${prA.number} ("${prA.title}") touches ${overlappingFiles[0]}, which is also changed by ${prB.author}'s PR #${prB.number}.\n\nSuggested action: Review ${overlappingFiles[0]} together before either PR is merged.`,
              authorB: `Heads up — your PR #${prB.number} ("${prB.title}") overlaps with ${prA.author}'s PR #${prA.number} on ${overlappingFiles[0]}.\n\nSuggested action: Coordinate with ${prA.author} before merging.`,
              reviewer: `BOB found a coordination risk between PR #${prA.number} and PR #${prB.number}.\n\nBefore approving either PR, check whether ${prA.author} and ${prB.author} have aligned on ${overlappingFiles.join(', ')}.`,
              teamLead: `BOB detected a ${riskLevel} Risk overlap.\n\nParties involved:\n• ${prA.author}, PR #${prA.number} — ${prA.title}\n• ${prB.author}, PR #${prB.number} — ${prB.title}\n\nAffected files: ${overlappingFiles.join(', ')}\n\nApproval needed: Should BOB post a coordination comment on both PRs?`
            },

            // Phase 6.5: Flags
            flags: {
              pr: [
                ...(riskLevel === 'High' ? ['High Risk Overlap'] : []),
                'Coordination Required',
                ...(hasSensitive ? ['Sensitive File Touched'] : []),
                ...(freshnessRisk ? ['Behind Main'] : [])
              ],
              file: [
                ...(hasSensitive ? ['Sensitive Area'] : []),
                'Multiple PRs Touching',
                ...(overlappingFiles.length > 1 ? ['Hotspot File'] : [])
              ],
              repo: [
                riskLevel === 'High' ? 'Critical' : riskLevel === 'Medium' ? 'Warning' : 'Healthy',
                ...(riskLevel !== 'Low' ? ['High PR Collision Activity'] : [])
              ],
              action: ['Needs Review']
            },

            // GitHub comment preview (requires approval before posting)
            githubCommentPreview: `🔍 **BOB Coordination Alert**\n\n> **${riskLevel} Risk** overlap detected (Score: ${Math.min(100, score)}/100)\n\nThis PR and PR #${prB.number} both modify:\n${overlappingFiles.map(f => `- \`${f}\``).join('\n')}\n\n**Recommended action:** ${prA.author} and ${prB.author} should coordinate before either PR is merged.\n\n${hasSensitive ? '⚠️ These files contain sensitive logic. Logic collisions are likely even if Git merges cleanly.\n\n' : ''}**Status:** ⏳ Pending ${ownerTeam} Lead approval.\n\n---\n_This comment was prepared by BOB — Repo Control Room._`,

            approvalRequired: true,
            approvalStatus: "Needs Review"
          });
        }
      }
    }

    return {
      repo: `${owner}/${repo}`,
      defaultBranch,
      openPullRequestCount: pullsWithFiles.length,
      activeBranchCount: branches.length,
      conflicts,
      lastScanned: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error scanning repo:', error.response?.data || error.message);
    throw error;
  }
}

function generateExplanation(prA, prB, overlappingFiles, hasSensitive, freshnessRisk) {
  let text = `Both PRs modify ${overlappingFiles.join(', ')}.`;
  if (hasSensitive) {
    text += ` These files contain sensitive logic (auth, security, or core config). Logic collisions are likely even if Git merges cleanly.`;
  }
  if (freshnessRisk) {
    text += ` One or both branches are significantly behind the default branch, increasing the risk of stale base conflicts.`;
  }
  if (!hasSensitive && !freshnessRisk) {
    text += ` Simultaneous changes to the same files increase the risk of merge conflicts or regression.`;
  }
  return text;
}

module.exports = { scanRepo };
