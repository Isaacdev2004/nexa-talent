/** Returns a problem with the new password, or null when it is acceptable. */
export function passwordProblem(pw: string, current?: string): string | null {
  if (pw.length < 12) return "Use at least 12 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Include upper and lower case letters and a number.";
  if (current && pw === current) return "Choose a password different from your temporary one.";
  return null;
}
