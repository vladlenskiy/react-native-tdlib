import { Package, Layers, Sparkles } from "lucide-react";

const props = [
  {
    icon: Package,
    title: "Prebuilt binaries",
    body: "No cmake, no brew install. npm install, pod install, and the whole of TDLib ships with your app — iOS xcframework (device + simulator), Android arm64-v8a, armeabi-v7a, x86_64.",
  },
  {
    icon: Layers,
    title: "Cross-platform parity",
    body: "iOS and Android emit the exact same TDLib JSON — snake_case keys, @type markers. One handler, one set of types, both stores.",
  },
  {
    icon: Sparkles,
    title: "TypeScript definitions",
    body: "Every wrapped method in `index.d.ts` — parameters, return shapes, input helpers. Update events arrive as `{ type, raw }` so you parse the TDLib JSON yourself, with the shape you expect.",
  },
];

export function ValueProps() {
  return (
    <section className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            What you get
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            TDLib, wrapped where it hurts.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {props.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-foreground/[0.035]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
