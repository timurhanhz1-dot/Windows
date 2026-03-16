
import DOMPurify from "dompurify";

export function sanitizeMessage(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
