import { CodeBlock } from "./code-block";
import { siteConfig } from "@/lib/site-config";

const INSTALL = `npm install react-native-tdlib
cd ios && pod install`;

const BOOT = `import TdLib from 'react-native-tdlib';
import { NativeEventEmitter, NativeModules } from 'react-native';

await TdLib.startTdLib({ api_id: 12345, api_hash: 'your_hash' });

const emitter = new NativeEventEmitter(NativeModules.TdLibModule);
emitter.addListener('tdlib-update', e => {
  if (e.type === 'updateNewMessage') {
    console.log('📨', JSON.parse(e.raw).message);
  }
});

await TdLib.sendMessage(chatId, 'Hello from React Native!');`;

export function QuickStart() {
  return (
    <section
      id="quickstart"
      className="scroll-mt-20 border-b border-border/60 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
            From zero to a live chat, on one screen.
          </h2>
          <a
            href={siteConfig.exampleUrl}
            className="text-sm text-muted underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-accent"
          >
            See the full example app →
          </a>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              1. Install
            </p>
            <CodeBlock code={INSTALL} lang="bash" />
            <p className="text-xs text-muted">
              RN ≥ 0.60 · iOS ≥ 11 · Android minSdk ≥ 21
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              2. Boot, listen, send
            </p>
            <CodeBlock code={BOOT} lang="ts" filename="app.ts" />
          </div>
        </div>
      </div>
    </section>
  );
}
