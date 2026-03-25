/** Normalize a raw string value: trim, collapse whitespace, remove most punctuation. */
export function normalizeValue(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ") // collapse whitespace
    .replace(/[^\w\s,/\-]/g, "") // remove punctuation except commas, hyphens, slashes
    .trim();
}
