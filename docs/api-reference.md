# API Reference

All methods return `Promise`. Legacy methods resolve with a JSON string; newer methods resolve with a typed `{raw: string}` wrapper (`TdRawResult`) and in some cases extra structured fields.

The authoritative contract is [`index.d.ts`](../index.d.ts). This page is a readable overview grouped by purpose.

## Authorization

| Method | Signature | Returns |
|---|---|---|
| `startTdLib` | `(params: TdLibParameters)` | `Promise<string>` — idempotent; safe to call repeatedly. |
| `login` | `(details: UserDetails)` | `Promise<string>` — submits phone number. |
| `verifyPhoneNumber` | `(code: string)` | `Promise<string>` |
| `verifyPassword` | `(password: string)` | `Promise<string>` |
| `getAuthorizationState` | `()` | `Promise<string>` — JSON `{@type: "authorizationState..."}`. |
| `getProfile` | `()` | `Promise<string>` — JSON of current `user`. |
| `logout` | `()` | `Promise<string>` — auto-resets native client so next `startTdLib` starts fresh. |
| `destroy` | `()` | `Promise<string>` — deletes **all** local TDLib data. |

```ts
interface TdLibParameters {
  api_id: number;
  api_hash: string;
  system_language_code?: string;
  device_model?: string;
  system_version?: string;
  application_version?: string;
}

interface UserDetails {
  countrycode: string;
  phoneNumber: string;
}
```

## Chats

| Method | Signature | Returns |
|---|---|---|
| `loadChats` | `(limit: number)` | `Promise<string>` — resolves `"No more chats to load"` when you've reached the end. |
| `getChats` | `(limit: number)` | `Promise<string>` — JSON array of full chat objects. |
| `getChat` | `(chatId: number)` | `Promise<TdRawResult>` |
| `openChat` | `(chatId: number)` | `Promise<TdRawResult>` — tells TDLib the user is viewing this chat. |
| `closeChat` | `(chatId: number)` | `Promise<{success: boolean}>` |
| `searchChats` | `(query: string, limit: number)` | `Promise<string>` — JSON array of full chat objects matching query. |
| `searchPublicChat` | `(username: string)` | `Promise<string>` — lookup `@username`. |
| `joinChat` | `(chatId: number)` | `Promise<TdRawResult>` |
| `leaveChat` | `(chatId: number)` | `Promise<TdRawResult>` |
| `createPrivateChat` | `(userId: number)` | `Promise<string>` |
| `getChatMember` | `(chatId: number, userId: number)` | `Promise<TdRawResult>` |
| `getSupergroup` | `(supergroupId: number)` | `Promise<TdRawResult>` |

## Messages

| Method | Signature | Returns |
|---|---|---|
| `sendMessage` | `(chatId, text, replyToMessageId?)` | `Promise<TdRawResult>` — `replyToMessageId` is optional; pass `0`/omit for a plain message. |
| `getMessage` | `(chatId, messageId)` | `Promise<TdRawResult>` |
| `getChatHistory` | `(chatId, fromMessageId, limit, offset)` | `Promise<Array<{raw_json: string}>>` |
| `getMessagesCompat` | `(chatId, messageIds)` | `Promise<string>` — bulk fetch. |
| `viewMessages` | `(chatId, messageIds, forceRead)` | `Promise<string>` — marks messages as read using `messageSourceChatHistory`. |
| `getChatMessagePosition` | `(chatId, messageId, threadId)` | `Promise<{raw: string, count?: number}>` |
| `getMessageThread` | `(chatId, messageId)` | `Promise<TdRawResult>` |
| `getMessageThreadHistory` | `(chatId, threadId, fromMessageId, offset, limit)` | `Promise<TdRawResult>` |

## Comments (channel / forum threads)

| Method | Signature | Returns |
|---|---|---|
| `addComment` | `(chatId, threadId, replyToMessageId, text)` | `Promise<string>` |
| `deleteComment` | `(chatId, messageId)` | `Promise<boolean>` |

## Reactions

| Method | Signature | Returns |
|---|---|---|
| `addMessageReaction` | `(chatId, messageId, emoji)` | `Promise<string>` |
| `removeMessageReaction` | `(chatId, messageId, emoji)` | `Promise<string>` |
| `getAddedReactions` | `(chatId, messageId)` | `Promise<TdRawResult>` |

## Users

| Method | Signature | Returns |
|---|---|---|
| `getUserProfile` | `(userId)` | `Promise<string>` |
| `getUserFull` | `(userId)` | `Promise<string>` |
| `getUserProfilePhotos` | `(userId, offset, limit)` | `Promise<string>` |
| `getUsersCompat` | `(userIds: number[])` | `Promise<string>` — bulk. |

## Files

| Method | Signature | Returns |
|---|---|---|
| `downloadFile` | `(fileId)` | `Promise<TdRawResult>` — **synchronous**; waits for the whole file. For UI avatars/previews prefer fire-and-forget via `td_json_client_send` — see the [Cookbook](./cookbook.md#downloading-files-fire-and-forget). |
| `downloadFileByRemoteId` | `(remoteId)` | `Promise<TdRawResult>` |
| `cancelDownloadFile` | `(fileId, onlyIfPending)` | `Promise<TdRawResult>` |
| `cancelDownloadByRemoteId` | `(remoteId, onlyIfPending)` | `Promise<TdCancelDownloadByRemoteIdResult>` |
| `getFile` | `(fileId)` | `Promise<TdRawResult>` |

## Options

| Method | Signature | Returns |
|---|---|---|
| `getOption` | `(name: string)` | `Promise<string \| null>` — value is coerced to string (`null` for empty). |
| `setOption` | `(name: string, value: SetOptionValue)` | `Promise<string>` |

```ts
interface SetOptionValue {
  type: 'string' | 'integer' | 'boolean' | 'empty';
  value?: string | number | boolean;
}
```

## Events & utilities

| Method | Signature | Notes |
|---|---|---|
| `addListener` | `(eventName: string)` | `RCTEventEmitter` glue — required by RN. |
| `removeListeners` | `(count: number)` | same. |
| `echoToJs` | `(payload)` | Round-trips a value through native and back. Useful for bridge sanity checks. |

## Low-level JSON client

Escape hatch for TDLib functions not yet wrapped with a dedicated method (`registerDevice`, `sendChatAction`, custom queries):

| Method | Signature | Notes |
|---|---|---|
| `td_json_client_create` | `()` | Creates a client. `startTdLib` does this for you. |
| `td_json_client_execute` | `(request)` | Synchronous, doesn't require auth (e.g. `getTextEntities`). |
| `td_json_client_send` | `(request)` | **Fire-and-forget.** Response, if any, arrives via `tdlib-update`. |
| `td_json_client_receive` | `()` | Blocking receive — only usable when the high-level API is **not** running. |

## Text helpers

| Method | Signature | Returns |
|---|---|---|
| `getTextEntities` | `(text: string)` | `Promise<string>` — parses Telegram entities like mentions, hashtags, bot commands, and URLs from plain text. |

## Result types

```ts
interface TdRawResult {
  raw: string; // raw TDLib JSON string
}

interface TdChatHistoryItem {
  raw_json: string; // raw TDLib JSON of a single message
}

interface TdChatMessagePositionResult extends TdRawResult {
  count?: number;
}

interface TdCancelDownloadByRemoteIdResult extends TdRawResult {
  tdFileId?: number;
  remoteFileId?: string;
  error?: string;
  message?: string;
}

interface TdLibUpdateEvent {
  type: string; // e.g. "updateNewMessage"
  raw:  string; // raw TDLib JSON
}
```
