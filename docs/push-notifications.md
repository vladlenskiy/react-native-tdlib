# Push Notifications

> ⚠️ **Status: untested**. This document describes the expected integration with TDLib's push API based on the upstream docs. The library's bridge has not been verified end-to-end against a real FCM/APNs push from Telegram. Treat it as a starting point, not a proven recipe. If you try it and it works (or doesn't), please open an issue — we'll turn this into a supported flow.

TDLib delivers **end-to-end encrypted** pushes over FCM (Android) and APNs (iOS). Google and Apple never see message content — your app decrypts the payload locally.

> `registerDevice` and `processPushNotification` are not yet wrapped as first-class methods. Use `td_json_client_send` — it's fire-and-forget and works for any TDLib function. Note: on Android, both need entries in the `convertMapToFunction` whitelist in [`TdLibModule.java`](../android/src/main/java/com/reactnativetdlib/tdlibclient/TdLibModule.java) — not yet added.

## 1. Register the device token

On Android, install [`@react-native-firebase/messaging`](https://rnfirebase.io/messaging/usage). On iOS, Firebase works too, or use `PushNotificationIOS`.

```ts
import TdLib from 'react-native-tdlib';
import messaging from '@react-native-firebase/messaging';

async function registerPushes() {
  await messaging().requestPermission();
  const token = await messaging().getToken();

  TdLib.td_json_client_send({
    '@type': 'registerDevice',
    device_token: {
      '@type': Platform.OS === 'ios'
        ? 'deviceTokenApplePush'              // or "deviceTokenApplePushVoIP"
        : 'deviceTokenFirebaseCloudMessaging',
      token,
      encrypt: true,    // E2E encryption — required for privacy
    },
    other_user_ids: [], // user IDs of other accounts on the device, if any
  });
}
```

Call this once after login, and again whenever the FCM/APNs token rotates (`messaging().onTokenRefresh`).

## 2. Handle incoming pushes

### Foreground

Easiest path — do nothing extra. You're already subscribed to `tdlib-update` and will receive `updateNewMessage` events. Show an in-app banner / local notification with [`@notifee/react-native`](https://notifee.app).

### Background / killed app

TDLib must be running to decrypt. On Android, use a headless JS task; on iOS, `content-available: 1` + background fetch.

```ts
// index.js — register a headless task for background pushes
import messaging from '@react-native-firebase/messaging';
import TdLib from 'react-native-tdlib';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  // TDLib must be initialised — if the process was killed, call startTdLib first.
  await TdLib.startTdLib({api_id, api_hash});

  // Hand the encrypted payload to TDLib
  TdLib.td_json_client_send({
    '@type': 'processPushNotification',
    payload: JSON.stringify(remoteMessage.data),
  });

  // TDLib will emit updateNotification / updateNotificationGroup once decrypted;
  // display those via notifee.displayNotification(...).
});
```

### Displaying the notification

```ts
import notifee from '@notifee/react-native';
import {NativeEventEmitter, NativeModules} from 'react-native';

const emitter = new NativeEventEmitter(NativeModules.TdLibModule);

emitter.addListener('tdlib-update', e => {
  if (e.type !== 'updateNotification') return;
  const {notification} = JSON.parse(e.raw);
  const content = notification?.type?.message?.content;
  const title   = notification?.type?.message?.sender_id
    ? /* resolve chat title here */ 'Telegram'
    : 'Telegram';
  const body = content?.text?.text ?? content?.['@type'] ?? 'New message';

  notifee.displayNotification({title, body});
});
```

## Multi-account

If the user is signed in to several accounts on the device, pass the other account IDs in `other_user_ids` when registering — Telegram uses that to avoid duplicate pushes.

## Gotchas

- **`encrypt: true` is non-negotiable** in production. Without it, the server would send plaintext through FCM/APNs — Telegram explicitly discourages this.
- On iOS, background decoding has tight time limits. Keep the `setBackgroundMessageHandler` callback fast — offload heavy work.
- When the app is fully killed, the first `startTdLib` in the background handler will re-initialise TDLib from disk. Expect a 200-500 ms cold start.
- Rotating tokens (`onTokenRefresh`) must re-call `registerDevice`, otherwise TDLib continues to push to the old token.

## Reference

- TDLib API: [`registerDevice`](https://core.telegram.org/tdlib/docs/classtd_1_1td__api_1_1register_device.html), [`processPushNotification`](https://core.telegram.org/tdlib/docs/classtd_1_1td__api_1_1process_push_notification.html)
- [Telegram MTProto push spec](https://core.telegram.org/api/push-updates)
