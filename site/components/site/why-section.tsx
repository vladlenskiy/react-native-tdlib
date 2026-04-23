export function WhySection() {
  return (
    <section className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          The problem
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Building a Telegram client shouldn&rsquo;t start with compiling 200 MB
          of C++.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          TDLib hands you the whole Telegram protocol — auth, chats, messages,
          reactions, files, real-time updates. But only if you&rsquo;re ready to
          wrestle with CMake on both platforms, ship your own{" "}
          <span className="font-mono text-[15px] text-foreground">xcframework</span>
          , and write platform-specific bridges that disagree on JSON shapes.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          <span className="text-foreground">react-native-tdlib</span> ships all
          of that. You write the app.
        </p>
      </div>
    </section>
  );
}
