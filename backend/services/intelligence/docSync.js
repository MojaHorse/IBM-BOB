function checkDocSync(docs) {
  const warnings = docs
    .filter(doc => doc.documentedEndpoint !== doc.actualEndpoint)
    .map(doc => ({
      file: doc.file,
      documentedEndpoint: doc.documentedEndpoint,
      actualEndpoint: doc.actualEndpoint,
      issue: `${doc.file} is outdated. It says ${doc.documentedEndpoint}, but the code uses ${doc.actualEndpoint}.`,
      suggestedFix: `Update ${doc.file} from "${doc.documentedEndpoint}" to "${doc.actualEndpoint}".`
    }));

  return {
    totalDocsChecked: docs.length,
    warningCount: warnings.length,
    warnings
  };
}

module.exports = { checkDocSync };