export const ASSESSMENT_CATEGORIES = ["Job relevance", "Relevant work experience", "Required skills", "Qualifications", "Professional achievements", "Resume structure", "Formatting", "ATS parsing compatibility", "Relevant keywords", "Supporting documents"] as const;
export const ASSESSMENT_OUTCOMES = ["Suitable", "Suitable with minor improvements", "Restructuring recommended", "Additional documents required", "More information required", "Further review required"] as const;

export function canPublishAssessment(findings: Record<string, string>, recommendations: string, outcome: string) {
  return ASSESSMENT_CATEGORIES.every((c) => Boolean(findings[c]?.trim())) && Boolean(recommendations.trim()) && ASSESSMENT_OUTCOMES.some((o) => o === outcome);
}

export function canReviewSpecialist(roles: string[]) {
  return roles.includes("admin") || roles.includes("super_admin");
}

export function canReadAssessment(isOwner: boolean, isStaff: boolean, status: string) {
  return isStaff || (isOwner && ["requested", "published"].includes(status));
}