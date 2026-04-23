import { Check, X } from "lucide-react";

const reachFor = [
  "You're shipping a Telegram experience on real user accounts, not bots.",
  "You need iOS and Android on the same JSON shape, same types, same TDLib version.",
  "You'd rather write app code than maintain a CMake toolchain on both platforms.",
];

const pickOther = [
  "Your bot lives server-side — `node-telegram-bot-api` is one npm install away.",
  "You're on Expo Go — native modules don't run there. EAS Build / bare RN works.",
  "You only need chat UI, not the protocol — reach for a chat-kit instead.",
];

function Item({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: "check" | "x";
}) {
  const Icon = icon === "check" ? Check : X;
  return (
    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-muted">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${
          icon === "check"
            ? "bg-accent/15 text-accent"
            : "bg-foreground/[0.06] text-muted"
        }`}
      >
        <Icon className="h-3 w-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function renderWithCode(line: string) {
  const parts = line.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <span key={i} className="font-mono text-foreground">
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function WhenToUse() {
  return (
    <section className="border-b border-border/60 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Is this for you?
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Two-minute fit check.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Reach for this if
            </h3>
            <ul className="mt-4 space-y-3">
              {reachFor.map((line) => (
                <Item key={line} icon="check">
                  {renderWithCode(line)}
                </Item>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Pick something else if
            </h3>
            <ul className="mt-4 space-y-3">
              {pickOther.map((line) => (
                <Item key={line} icon="x">
                  {renderWithCode(line)}
                </Item>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
