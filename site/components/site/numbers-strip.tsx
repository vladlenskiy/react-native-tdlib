import { getLatestRelease, relativeDate } from "@/lib/release";

export function NumbersStrip() {
  const release = getLatestRelease();
  const releaseLabel = release
    ? {
        value: `v${release.version}`,
        label: `Released ${relativeDate(release.date)}`,
      }
    : { value: "MIT", label: "Boost-licensed TDLib" };

  const stats = [
    { value: "51", label: "Wrapped methods" },
    { value: "3", label: "Android ABIs prebuilt" },
    { value: "0", label: "Lines of cmake on your end" },
    releaseLabel,
  ];

  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <dl className="grid grid-cols-2 divide-border/60 md:grid-cols-4 md:divide-x">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col gap-1 py-8 ${
                i >= 2 ? "border-t border-border/60 md:border-t-0" : ""
              } md:px-6`}
            >
              <dt className="order-2 font-mono text-xs uppercase tracking-widest text-muted">
                {s.label}
              </dt>
              <dd className="order-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
