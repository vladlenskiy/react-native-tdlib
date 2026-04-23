import { codeToHtml } from "shiki";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

type Lang = "ts" | "tsx" | "bash" | "json";

type Props = {
  code: string;
  lang?: Lang;
  className?: string;
  filename?: string;
  copy?: boolean;
};

export async function CodeBlock({
  code,
  lang = "ts",
  className,
  filename,
  copy = true,
}: Props) {
  const html = await codeToHtml(code, {
    lang,
    theme: "github-dark-default",
    transformers: [
      {
        pre(node) {
          node.properties.class = cn(
            "overflow-x-auto text-[13px] leading-[1.7] py-4 px-4 font-mono",
            node.properties.class as string,
          );
          node.properties.style = "background: transparent";
        },
      },
    ],
  });

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-[#0d1117]",
        className,
      )}
    >
      {filename ? (
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-2 font-mono text-xs text-zinc-400">
          <span>{filename}</span>
          {copy ? (
            <CopyButton
              value={code}
              className="h-7 w-7 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            />
          ) : null}
        </div>
      ) : copy ? (
        <div className="pointer-events-none absolute right-2 top-2 z-10 opacity-90">
          <CopyButton
            value={code}
            className="pointer-events-auto h-8 w-8 border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100"
          />
        </div>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
