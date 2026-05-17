function detectConflicts(pullRequests) {
  const conflicts = [];

  for (let i = 0; i < pullRequests.length; i++) {
    for (let j = i + 1; j < pullRequests.length; j++) {
      const prA = pullRequests[i];
      const prB = pullRequests[j];

      const overlappingFiles = prA.filesChanged.filter(file =>
        prB.filesChanged.includes(file)
      );

      if (overlappingFiles.length > 0) {
        conflicts.push({
          prA: prA.id,
          prATitle: prA.title,
          prAAuthor: prA.author,
          prB: prB.id,
          prBTitle: prB.title,
          prBAuthor: prB.author,
          overlappingFiles,
          risk: overlappingFiles.length > 1 ? "High" : "Medium"
        });
      }
    }
  }

  return conflicts;
}

module.exports = { detectConflicts };