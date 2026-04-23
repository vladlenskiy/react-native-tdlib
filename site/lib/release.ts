import { readFileSync } from "node:fs";
import path from "node:path";

const CHANGELOG = path.join(process.cwd(), "..", "CHANGELOG.md");

export function getLatestRelease(): { version: string; date: string } | null {
  try {
    const text = readFileSync(CHANGELOG, "utf8");
    const m = text.match(
      /^##\s*\[?(\d+\.\d+\.\d+)\]?[^\n]*\((\d{4}-\d{2}-\d{2})\)/m,
    );
    if (!m) return null;
    return { version: m[1], date: m[2] };
  } catch {
    return null;
  }
}

export function relativeDate(iso: string, now = new Date()): string {
  // Use `Math.floor` so a label like "yesterday" only appears after a full
  // calendar day has elapsed, not after ~12 hours.
  const then = new Date(iso + "T00:00:00Z");
  const days = Math.max(
    0,
    Math.floor((now.getTime() - then.getTime()) / 86_400_000),
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}
