import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site-config";
import { formatStars } from "@/lib/github";

export function StarCTA({ stars }: { stars: number | null }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(55% 55% at 50% 50%, rgba(34,158,217,0.18), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Like it? Drop a star.
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
          One click keeps this library alive.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Stars make{" "}
          <span className="font-mono text-foreground">react-native-tdlib</span>{" "}
          more discoverable for the next dev trying to skip a week of TDLib
          compilation. Takes five seconds. Means a lot.
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
            <a href={siteConfig.sponsorUrl}>Sponsor on GitHub</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
