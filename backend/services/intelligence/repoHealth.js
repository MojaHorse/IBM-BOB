function getRepoHealth({ pullRequests, branches, conflicts }) {
  const outdatedBranches = branches.filter(branch => branch.behindMainBy > 0);

  let overallStatus = "Healthy";

  if (conflicts.length > 0 || outdatedBranches.length > 0) {
    overallStatus = "Warning";
  }

  const suggestedActions = [];

  conflicts.forEach(conflict => {
    suggestedActions.push(
      `Review PR #${conflict.prA} and PR #${conflict.prB}; both modify ${conflict.overlappingFiles.join(", ")}.`
    );
  });

  outdatedBranches.forEach(branch => {
    suggestedActions.push(
      `Update ${branch.name}; it is ${branch.behindMainBy} commit(s) behind main.`
    );
  });

  return {
    repo: "payment-service",
    overallStatus,
    openPullRequests: pullRequests.length,
    conflictCount: conflicts.length,
    outdatedBranchCount: outdatedBranches.length,
    outdatedBranches,
    suggestedActions
  };
}

module.exports = { getRepoHealth };