# Getting Started

## 1. Install

```bash
npm install react-native-tdlib
cd ios && pod install
```

Requirements: React Native ≥ 0.60, iOS ≥ 11, Android `minSdk` ≥ 21.

Autolinking takes care of linking the module. The prebuilt TDLib binaries (iOS `xcframework`, Android `.so` libraries for `arm64-v8a`, `armeabi-v7a`, `x86_64`) ship inside the package — no extra setup.

## 2. Get api_id / api_hash

Go to <https://my.telegram.org/apps> and create a new application. You'll get:

- `api_id` — integer
- `api_hash` — 32-character string

Keep these server-side in production apps — they authenticate **your** client to Telegram.

## 3. Start TDLib

```ts
import TdLib from 'react-native-tdlib';

await TdLib.startTdLib({
  api_id: 12345678,
  api_hash: 'your_api_hash',
  device_model: 'React Native',
  system_version: '1.0',
  application_version: '1.0',
  system_language_code: 'en',
});
```

`startTdLib` is idempotent — safe to call multiple times. TDLib persists state between launches, so a returning user will not be asked to log in again.

## 4. Subscribe to updates

TDLib is **event-driven**. You don't poll for new messages — you subscribe to updates.

```ts
import {NativeEventEmitter, NativeModules} from 'react-native';

const emitter = new NativeEventEmitter(NativeModules.TdLibModule);

const sub = emitter.addListener('tdlib-update', event => {
  // event.type: TDLib update name, e.g. "updateNewMessage"
  // event.raw:  raw TDLib JSON for the update
  console.log(event.type, JSON.parse(event.raw));
});

// Clean up when the component unmounts
sub.remove();
```

See [Events](./events.md) for the full list of update types.

## 5. Drive the auth flow

Never hard-code "phone → code → password" — TDLib may route through registration, email confirmation, or skip straight to Ready on returning users. Drive the UI reactively from `updateAuthorizationState`.

```ts
emitter.addListener('tdlib-update', e => {
  if (!e.type.startsWith('updateAuthorizationState')) return;
  const state = JSON.parse(e.raw).authorization_state['@type'];
  switch (state) {
    case 'authorizationStateWaitPhoneNumber': /* show phone input */    break;
    case 'authorizationStateWaitCode':        /* show SMS code input */ break;
    case 'authorizationStateWaitPassword':    /* show 2FA input */      break;
    case 'authorizationStateReady':           /* ✅ logged in */        break;
    case 'authorizationStateClosed':          /* logged out — rerun startTdLib */ break;
  }
});
```

The example app ships a production-ready `useAuthState()` hook that does this for you — see [`example/src/tdlib.ts`](../example/src/tdlib.ts).

Submit credentials:

```ts
await TdLib.login({countrycode: '+1', phoneNumber: '5551234567'});
await TdLib.verifyPhoneNumber('12345');    // SMS code
await TdLib.verifyPassword('password');    // only if 2FA is enabled
```

## 6. First chat list

```ts
// Pull 25 chats from the server into the local cache
await TdLib.loadChats(25);

// Read them back (as a JSON array of full chat objects)
const raw = await TdLib.getChats(25);
const chats = JSON.parse(raw);

for (const chat of chats) {
  console.log(chat.id, chat.title, chat.unread_count);
}
```

## Next steps

- [Cookbook](./cookbook.md) — send messages, reactions, download files, typing.
- [API Reference](./api-reference.md) — every available method.
- Browse [`example/`](../example) for a full working client.
