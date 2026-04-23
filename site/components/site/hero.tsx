import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site-config";
import { asset } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Telegram · TDLib · iOS + Android
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
            Build a real Telegram client
            <br />
            in <span className="text-accent">React Native.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Official{" "}
            <a
              href="https://github.com/tdlib/td"
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
            >
              TDLib
            </a>{" "}
            under the hood. Prebuilt binaries for both platforms, a single
            typed API for all 51 methods, and every Telegram update streaming
            live through <span className="font-mono text-sm">NativeEventEmitter</span>.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <a href={siteConfig.repoUrl + "/tree/master/docs/getting-started.md"}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <a href={siteConfig.repoUrl}>
                <GithubIcon className="h-4 w-4" />
                Star on GitHub
              </a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 font-mono text-[13px] text-muted">
            <span>
              <span className="text-foreground">$</span> npm i react-native-tdlib
            </span>
            <span className="hidden sm:inline">·</span>
            <span>MIT</span>
            <span className="hidden sm:inline">·</span>
            <span>RN ≥ 0.60</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-border bg-[#0d1117] p-2 shadow-[0_20px_60px_-20px_rgba(34,158,217,0.35)]">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-3 font-mono text-[11px] text-zinc-400">
                example/ — iOS Simulator
              </span>
            </div>
            <div className="overflow-hidden rounded-lg bg-black">
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster={asset("/example-poster.jpg")}
                width={900}
                height={1640}
                className="block h-auto w-full"
              >
                <source src={asset("/example.webm")} type="video/webm" />
                <source src={asset("/example.mp4")} type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
