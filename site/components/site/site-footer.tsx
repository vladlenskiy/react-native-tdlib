import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="font-mono text-xs text-muted">
          MIT · Built by{" "}
          <a
            href={siteConfig.xUrl}
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
          >
            @vladlensk1y
          </a>
          .{" "}
          <a
            href="https://github.com/tdlib/td"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
          >
            TDLib
          </a>{" "}
          is Boost-licensed.
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-muted">
          <a
            href={siteConfig.repoUrl + "/tree/master/docs"}
            className="hover:text-foreground"
          >
            Docs
          </a>
          <a href={siteConfig.repoUrl} className="hover:text-foreground">
            GitHub
          </a>
          <a href={siteConfig.npmUrl} className="hover:text-foreground">
            npm
          </a>
          <a href={siteConfig.xUrl} className="hover:text-foreground">
            X / Twitter
          </a>
          <a href={siteConfig.sponsorUrl} className="hover:text-foreground">
            Sponsor
          </a>
        </nav>
      </div>
    </footer>
  );
}
