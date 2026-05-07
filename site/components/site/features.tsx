import { FeatureBlock } from "./feature-block";

const AUTH_CODE = `emitter.addListener('tdlib-update', e => {
  if (!e.type.startsWith('updateAuthorizationState')) return;
  const state = JSON.parse(e.raw).authorization_state['@type'];

  switch (state) {
    case 'authorizationStateWaitPhoneNumber': /* show phone input */ break;
    case 'authorizationStateWaitCode':        /* show SMS code input */ break;
    case 'authorizationStateWaitPassword':    /* show 2FA input */ break;
    case 'authorizationStateReady':           /* ✅ logged in */ break;
  }
});`;

const EVENTS_CODE = `const emitter = new NativeEventEmitter(NativeModules.TdLibModule);

const sub = emitter.addListener('tdlib-update', event => {
  const { type, raw } = event;
  const data = JSON.parse(raw);

  if (type === 'updateNewMessage')     console.log('message', data.message);
  if (type === 'updateChatAction')     console.log('typing',  data.action);
  if (type === 'updateFile')           console.log('file',    data.file);
  if (type === 'updateUserStatus')     console.log('status',  data.status);
});

sub.remove(); // on unmount`;

const MESSAGES_CODE = `// Load and list chats
await TdLib.loadChats(25);
const chats = JSON.parse(await TdLib.getChats(25));

// Send a message or reply
await TdLib.sendMessage(chatId, 'Hello');
await TdLib.sendMessage(chatId, 'Replying', messageId);

// Reactions
await TdLib.addMessageReaction(chatId, messageId, '❤️');
await TdLib.removeMessageReaction(chatId, messageId, '❤️');`;

const FILES_CODE = `TdLib.td_json_client_send({
  '@type': 'downloadFile',
  file_id: fileId,
  priority: 1,
  synchronous: false,
});

emitter.addListener('tdlib-update', e => {
  if (e.type !== 'updateFile') return;
  const { file } = JSON.parse(e.raw);
  if (file.id === fileId && file.local?.is_downloading_completed) {
    setLocalPath(\`file://\${file.local.path}\`);
  }
});`;

const TYPING_CODE = `// Tell the server you're typing
TdLib.td_json_client_send({
  '@type': 'sendChatAction',
  chat_id: chatId,
  action: { '@type': 'chatActionTyping' },
});

// Render "someone is typing…" for incoming actions
emitter.addListener('tdlib-update', e => {
  if (e.type !== 'updateChatAction') return;
  const { chat_id, action } = JSON.parse(e.raw);
  setTyping(chat_id, action['@type'] !== 'chatActionCancel');
});`;

const ESCAPE_CODE = `// Anything not yet wrapped — call it directly.
// The response (or update) arrives on the same stream.
TdLib.td_json_client_send({
  '@type': 'setChatTitle',
  chat_id: chatId,
  title: 'New title',
});`;

const PARITY_CODE = `// Same event payload on iOS and Android:
{
  type: 'updateNewMessage',
  raw: '{"@type":"updateNewMessage","message":{'
     + '"chat_id":1234567890,"id":100,"date":1700000000,'
     + '"content":{"@type":"messageText","text":{"@type":"formattedText","text":"hi"}}'
     + '}}',
}`;

export function Features() {
  return (
    <section className="border-b border-border/60 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            The surface
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            The TDLib surface, wrapped.
          </h2>
        </div>

        <div className="mt-6 divide-y divide-border/60">
          <FeatureBlock
            eyebrow="Authentication"
            title="Reactive auth, not a fixed sequence."
            body={
              <>
                TDLib doesn&rsquo;t follow a rigid login flow. It may skip to
                registration, request email confirmation, or go straight to{" "}
                <span className="font-mono text-foreground">Ready</span> for
                returning users. Drive your auth UI from{" "}
                <span className="font-mono text-foreground">updateAuthorizationState</span>
                {" "}
                and your app adapts to whatever Telegram sends.
              </>
            }
            code={AUTH_CODE}
          />
          <FeatureBlock
            eyebrow="Real-time updates"
            reverse
            title="Event-driven by design. No polling."
            body={
              <>
                Every change — new messages, typing, read receipts, download
                progress, reactions, online status — flows through a single{" "}
                <span className="font-mono text-foreground">tdlib-update</span>{" "}
                event. Subscribe once, fan out to the reducers that care.
              </>
            }
            code={EVENTS_CODE}
          />
          <FeatureBlock
            eyebrow="Chats & messages"
            title="Load, send, react — one-liners on both platforms."
            body={
              <>
                All 52 methods — chats, messages, reactions, replies, files,
                options, users — are wrapped, typed, and tested on iOS and
                Android. Same signatures, same error codes, same JSON shapes.
              </>
            }
            code={MESSAGES_CODE}
          />
          <FeatureBlock
            eyebrow="Files"
            reverse
            title="Stream downloads, render thumbnails while you wait."
            body={
              <>
                Kick off downloads fire-and-forget via{" "}
                <span className="font-mono text-foreground">td_json_client_send</span>{" "}
                so the bridge stays free. Watch{" "}
                <span className="font-mono text-foreground">updateFile</span> for
                progress and render the TDLib-provided mini-thumbnail until the
                full image arrives.
              </>
            }
            code={FILES_CODE}
          />
          <FeatureBlock
            eyebrow="Typing indicators"
            title="Broadcast and display typing in real time."
            body={
              <>
                Send{" "}
                <span className="font-mono text-foreground">chatActionTyping</span>
                {" "}
                while the user is in the input field. Read{" "}
                <span className="font-mono text-foreground">updateChatAction</span>{" "}
                to show the familiar &ldquo;someone is typing…&rdquo; bubble.
              </>
            }
            code={TYPING_CODE}
          />
          <FeatureBlock
            eyebrow="Cross-platform parity"
            reverse
            title="Write one handler. Ship both stores."
            body={
              <>
                A Gson adapter on Android ensures every Java object serializes
                with snake_case keys and{" "}
                <span className="font-mono text-foreground">@type</span> markers —
                identical to the canonical JSON iOS emits directly. No platform
                branches, no shape-by-shape parsing.
              </>
            }
            code={PARITY_CODE}
            codeLang="ts"
          />
          <FeatureBlock
            eyebrow="Escape hatch"
            title="The whole TDLib surface is one call away."
            body={
              <>
                52 methods are wrapped with typed signatures. Everything else —{" "}
                <span className="font-mono text-foreground">setChatTitle</span>,{" "}
                <span className="font-mono text-foreground">searchMessages</span>,{" "}
                <span className="font-mono text-foreground">setProfilePhoto</span>,
                whatever TDLib adds next — is reachable via{" "}
                <span className="font-mono text-foreground">td_json_client_send</span>.
                Fire-and-forget; the response lands on the same update stream.
              </>
            }
            code={ESCAPE_CODE}
          />
        </div>
      </div>
    </section>
  );
}
