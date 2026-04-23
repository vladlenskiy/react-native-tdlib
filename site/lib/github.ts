import { siteConfig } from "./site-config";

export async function getRepoStats(): Promise<{ stars: number | null }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${siteConfig.repo}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: false },
      },
    );
    if (!res.ok) return { stars: null };
    const data = (await res.json()) as { stargazers_count?: number };
    return { stars: data.stargazers_count ?? null };
  } catch {
    return { stars: null };
  }
}

export function formatStars(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
