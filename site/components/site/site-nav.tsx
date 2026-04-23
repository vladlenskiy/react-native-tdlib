import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon, Logo } from "@/components/ui/icons";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/lib/site-config";
import { formatStars } from "@/lib/github";

export function SiteNav({ stars }: { stars: number | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight"
        >
          <Logo className="h-7 w-7 text-foreground/80" />
          <span>{siteConfig.name}</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href={siteConfig.repoUrl + "/tree/master/docs"}>Docs</a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href={siteConfig.npmUrl}>npm</a>
          </Button>
          <ThemeToggle />
          <Button variant="secondary" size="sm" asChild>
            <a
              href={siteConfig.repoUrl}
              className="flex items-center gap-2"
              aria-label="Star on GitHub"
            >
              <GithubIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Star</span>
              <span className="inline-flex items-center gap-1 rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                <Star className="h-3 w-3" />
                {formatStars(stars)}
              </span>
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
