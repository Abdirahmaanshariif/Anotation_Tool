module.exports = {
  export: {
    noData: "No annotations found to export.",
    unsupported: "File format not supported. Please choose CSV, Excel, or JSON.",
    error: "Something went wrong while exporting your data. Please try again.",
  },
  annotation: {
    notFound: "Annotation not found.",
    alreadyExists: "Annotation already exists for this text and user.",
    createError: "Error submitting annotation.",
    updateError: "Error updating annotation.",
    deleteError: "Error deleting annotation.",
    allDeleteError: "Error deleting all annotations.",
    unauthorized: "You are not authorized to perform this action.",
    invalidId: "Invalid annotation ID format.",
    skipError: "Failed to skip annotation.",
    skipMissingFields: "Missing required fields to skip.",
  },
  assigned: {
    fetchError: "Failed to fetch assigned texts.",
  },
  progress: {
    fetchError: "Failed to fetch progress.",
    updateError: "Failed to update progress.",
    resetError: "Progress reset failed.",
  },
  stats: {
    loadError: "Failed to load dashboard data.",
  },
  count: {
    myCountError: "Failed to count your annotations.",
    pendingError: "Failed to get pending reviews.",
  },
  general: {
    internalError: "Internal server error.",
    success: "Operation successful.",
  },
};
