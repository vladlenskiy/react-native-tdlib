import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site-config";
import { formatStars } from "@/lib/github";

export function StarCTA({ stars }: { stars: number | null }) {
  return (
    <section className="border-b border-border/60 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          GitHub
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Star it if it works for you.
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          Stars are the discovery signal for React Native wrappers on GitHub.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <a href={siteConfig.repoUrl}>
              <GithubIcon className="h-5 w-5" />
              Star on GitHub
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-accent-foreground/15 px-2 py-0.5 font-mono text-xs">
                <Star className="h-3 w-3" />
                {formatStars(stars)}
              </span>
            </a>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href={siteConfig.sponsorUrl}>Sponsor</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
