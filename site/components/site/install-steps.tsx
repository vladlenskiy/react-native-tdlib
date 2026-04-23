import { CodeBlock } from "./code-block";

const INSTALL_CMD = `npm install react-native-tdlib
cd ios && pod install`;

const HELLO_CODE = `import TdLib from 'react-native-tdlib';
import { NativeEventEmitter, NativeModules } from 'react-native';

const emitter = new NativeEventEmitter(NativeModules.TdLibModule);

// 1. Boot TDLib
await TdLib.startTdLib({ api_id: 12345, api_hash: 'your_hash' });

// 2. Listen for every update
emitter.addListener('tdlib-update', e => {
  if (e.type === 'updateNewMessage') {
    console.log('📨', JSON.parse(e.raw).message);
  }
});

// 3. Log in and go
await TdLib.login({ countrycode: '+1', phoneNumber: '5551234567' });
await TdLib.verifyPhoneNumber('12345');

const chats = JSON.parse(await TdLib.getChats(25));
await TdLib.sendMessage(chats[0].id, 'Hello from React Native!');`;

export function InstallSteps() {
  return (
    <section className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Get started
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Install, boot, and you&rsquo;re on the wire.
          </h2>
        </div>

        <div className="mt-12 space-y-10">
          <div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border font-mono text-xs">
                1
              </span>
              Install
            </div>
            <div className="mt-3">
              <CodeBlock code={INSTALL_CMD} lang="bash" />
            </div>
            <p className="mt-3 text-sm text-muted">
              Requires React Native ≥ 0.60, iOS ≥ 11, Android minSdk ≥ 21, Node ≥ 18.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border font-mono text-xs">
                2
              </span>
              Boot, listen, go
            </div>
            <div className="mt-3">
              <CodeBlock
                code={HELLO_CODE}
                lang="ts"
                filename="hello-telegram.ts"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border font-mono text-xs">
                3
              </span>
              Want the full thing?
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              The repo ships{" "}
              <a
                href="https://github.com/vladlenskiy/react-native-tdlib/tree/master/example"
                className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
              >
                a complete Telegram-like example app
              </a>{" "}
              — auth wizard, chat list with live updates, chat view with
              reactions, replies, typing indicator, photo previews, pagination.
              Clone it, run it, fork it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
