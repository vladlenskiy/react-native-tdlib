import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GithubIcon, Logo } from "@/components/ui/icons";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/lib/site-config";

export function SiteNav() {
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
            <a href={siteConfig.docsUrl}>Docs</a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href={siteConfig.npmUrl}>npm</a>
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <a href={siteConfig.repoUrl} aria-label="GitHub repository">
              <GithubIcon className="h-4 w-4" />
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
