/** Detect whether content string is BlockNote JSON or legacy HTML */
export function isBlockNoteJson(content: string | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]");
}
