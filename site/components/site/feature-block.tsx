import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  code: string;
  codeLang?: "ts" | "tsx" | "bash";
  filename?: string;
  /** Reverse the two-column order on wide viewports. */
  reverse?: boolean;
};

export async function FeatureBlock({
  eyebrow,
  title,
  body,
  code,
  codeLang = "ts",
  filename,
  reverse,
}: Props) {
  return (
    <div
      className={cn(
        "grid gap-8 py-14 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-14",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h3>
        <div className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          {body}
        </div>
      </div>
      <div className="min-w-0">
        <CodeBlock code={code} lang={codeLang} filename={filename} />
      </div>
    </div>
  );
}
