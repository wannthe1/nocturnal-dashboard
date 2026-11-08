export const MAX_NAME_LENGTH = 40;

// Tidies a preferred name: no invisible control characters or extra spaces.
export function cleanName(value: unknown) {
  return String(value ?? "").replace(/\p{Cc}/gu, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}
