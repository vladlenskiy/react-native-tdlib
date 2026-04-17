# Platform Parity

This bridge aims for **identical JS-visible behaviour** on iOS and Android. If you find a behavioural divergence, it's a bug — please open an issue.

## What "parity" means here

- **One event name**: both platforms emit updates on `tdlib-update`. No `TDLibUpdate` vs `tdlib-update`, no legacy aliases.
- **Identical payload shape**: `{type: string, raw: string}`. `type` is the camelCase TDLib name (`updateNewMessage`, `updateFile`, …); `raw` is canonical TDLib JSON — `@type` markers, snake_case keys everywhere.
- **Same error codes and messages** for rejected promises.
- **Same method signatures** across the native modules — when a JS call crosses the bridge, the order and types of arguments match.
- **Fire-and-forget semantics** for `td_json_client_send` — it resolves immediately with `"Request sent successfully"` on both platforms. Responses, when relevant, arrive via the update stream.

## How it's implemented

### iOS

The iOS module uses TDLib's **native C JSON interface** directly (`td_json_client_send` / `td_json_client_receive`). The receive loop runs on a background queue, reads raw JSON strings from TDLib, and emits them as `tdlib-update` events unchanged. That means `raw` is already canonical TDLib JSON — no conversion needed.

For request correlation (matching a JS promise to its response), every outgoing request gets an auto-generated `@extra` field; the receive loop looks it up in a pending-promise table.

### Android

The Android module uses TDLib's **typed Java bindings** (`TdApi.Object` tree). Those Java objects would, by default, serialize to camelCase JSON with no `@type` — incompatible with iOS. To fix that, we install a custom Gson adapter ([`TdLibJson.java`](../android/src/main/java/com/reactnativetdlib/tdlibclient/TdLibJson.java)) that:

1. Sets `FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES` (→ snake_case).
2. Registers a `JsonSerializer<TdApi.Object>` which:
   - Injects `@type` with the lowercase-first-letter class name (e.g. `MessageText` → `"messageText"`).
   - Recursively re-enriches nested `TdApi.Object` fields and `TdApi.Object[]` arrays, so every level of the tree has its `@type`.

The result is byte-compatible with iOS-emitted JSON.

## Known divergences

None currently intended. A few historical gotchas that are already fixed:

- **`sendMessage` with reply** — now takes `replyToMessageId` as a third parameter on both platforms.
- **`viewMessages` source** — uses `messageSourceChatHistory` on both platforms; previously Android used `messageSourceChatList`, which TDLib does not treat as "read".
- **`destroy` on iOS** — now calls `td_json_client_destroy` and cleans up the pending-promise table.
- **`authorizationStateClosed` auto-reset** — both platforms destroy the native client on close so the next `startTdLib` starts fresh.
- **`forum_topic_id` width** — cast to `int` on both platforms to match the current TDLib schema.

## When you call something not yet wrapped

Prefer `TdLib.td_json_client_send({...})` over writing platform-specific code. Android internally converts your JSON into the right `TdApi.Function` subclass — as long as the `@type` is in the conversion whitelist in `convertMapToFunction`. Currently supported raw functions include: `downloadFile`, `sendChatAction`, `viewMessages`, `addMessageReaction`, `removeMessageReaction`, `getAuthorizationState`, `getChat`, `getMessage`, `getChatHistory`, `searchPublicChat`, `setAuthenticationPhoneNumber`, `checkAuthenticationCode`, `close`.

Need another? Two-liner PR — add a case to `convertMapToFunction`.
