# Events

All TDLib updates arrive through a single RN event — `tdlib-update`.

## Subscribing

```ts
import {NativeEventEmitter, NativeModules} from 'react-native';
const emitter = new NativeEventEmitter(NativeModules.TdLibModule);

const sub = emitter.addListener('tdlib-update', event => {
  // event.type: string — TDLib update name, e.g. "updateNewMessage"
  // event.raw:  string — raw TDLib JSON for this update
});

sub.remove(); // on unmount
```

## Event shape

```ts
interface TdLibUpdateEvent {
  type: string; // camelCase TDLib type: "updateNewMessage", "updateFile", ...
  raw:  string; // canonical TDLib JSON with @type and snake_case fields
}
```

The same shape is emitted on both iOS and Android. Parse `raw` with `JSON.parse`.

## Cheatsheet — updates you care about

| Update | Why you listen |
|---|---|
| `updateAuthorizationState` | drive the auth UI — show phone / code / password forms |
| `updateNewMessage` | incoming message arrived |
| `updateMessageContent` | a message was edited |
| `updateMessageSendSucceeded` / `updateMessageSendFailed` | your outgoing message was accepted or bounced |
| `updateMessageInteractionInfo` | reactions / views on a message changed |
| `updateDeleteMessages` | messages deleted |
| `updateChatLastMessage` | preview in the chat list changed |
| `updateChatReadInbox` | unread count changed — refresh the badge |
| `updateChatReadOutbox` | the other side read your messages — update "read" ticks |
| `updateChatPosition` | a chat moved in the list |
| `updateChatTitle` / `updateChatPhoto` | chat renamed / avatar changed |
| `updateNewChat` | a chat entered the local cache |
| `updateChatAction` | someone is typing / recording in a chat |
| `updateUserStatus` | online / last seen |
| `updateUser` | user info changed |
| `updateFile` | file download or upload progressed — update previews |
| `updateNotification` / `updateNotificationGroup` | push notification payload (for local display) |
| `updateConnectionState` | `connectionStateConnecting` / `Ready` / `Updating` / `WaitingForNetwork` |
| `updateOption` | an internal TDLib option changed |

## Patterns

### Keep the handler in a ref

RN re-creates arrow-function handlers on every render — don't re-subscribe each time:

```ts
function useTdUpdate(prefix: string, handler: (data: any) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const sub = emitter.addListener('tdlib-update', e => {
      if (!e?.type?.startsWith(prefix)) return;
      try { ref.current(JSON.parse(e.raw)); } catch {}
    });
    return () => sub.remove();
  }, [prefix]);
}
```

Used in the [example app](../example/src/tdlib.ts).

### Debounce chat-list refreshes

TDLib bursts many `updateNewMessage` / `updateChatLastMessage` events during catch-up. Don't call `getChats` on every one — debounce to ~400ms:

```ts
let timer: any = null;
function scheduleRefresh() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; refresh(); }, 400);
}
```

### Track typing users with timeouts

TDLib only sends `chatActionCancel` when a peer explicitly stops — apply a local 5-second timeout as a safety net so a stuck indicator eventually clears.

## Extra events

- `EchoFromObjC` / `EchoFromJava` — emitted by `TdLib.echoToJs(payload)`. Useful to sanity-check the bridge end-to-end.
