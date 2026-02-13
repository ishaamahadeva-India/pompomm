/**
 * Sanitization for user-generated content that may be stored and rendered (e.g. in UI or exports).
 * Reduces XSS and injection risk when content is displayed or re-used in other contexts.
 */

const HTML_TAG_REGEX = /<[^>]*>/g;
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Strip HTML tags and control characters from a string. Use for display_name, bio, title, description, etc.
 * Trims and limits length; returns empty string for null/undefined.
 */
export function sanitizeText(input: string | null | undefined, maxLength: number = 10_000): string {
  if (input == null) return "";
  let s = String(input)
    .replace(HTML_TAG_REGEX, "")
    .replace(CONTROL_CHARS_REGEX, "")
    .trim();
  if (maxLength > 0 && s.length > maxLength) s = s.slice(0, maxLength);
  return s;
}

/**
 * Sanitize for optional short text (e.g. display_name, unique_creator_id already validated by schema).
 */
export function sanitizeShortText(input: string | null | undefined, maxLength: number = 200): string {
  return sanitizeText(input, maxLength);
}
