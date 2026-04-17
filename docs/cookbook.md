# Cookbook

Practical recipes. All snippets assume you have:

```ts
import TdLib from 'react-native-tdlib';
import {NativeEventEmitter, NativeModules} from 'react-native';
const emitter = new NativeEventEmitter(NativeModules.TdLibModule);
```

---

## Listing chats with live updates

```ts
await TdLib.loadChats(25);
const raw = await TdLib.getChats(25);
const chats = JSON.parse(raw);

emitter.addListener('tdlib-update', e => {
  if (
    e.type === 'updateNewMessage'      ||
    e.type === 'updateChatLastMessage' ||
    e.type === 'updateChatReadInbox'   ||
    e.type === 'updateChatPosition'    ||
    e.type === 'updateNewChat'
  ) {
    refresh(); // debounce in real apps — TDLib bursts many updates at once
  }
});
```

## Pagination

```ts
const PAGE = 25;
let loaded = 0;
let hasMore = true;

async function loadMore() {
  if (!hasMore) return;
  const r = await TdLib.loadChats(PAGE).catch(() => null);
  if (r === 'No more chats to load') hasMore = false;
  loaded += PAGE;
  const chats = JSON.parse(await TdLib.getChats(loaded));
  setChats(chats);
}
```

## Reading message history and marking as read

```ts
const history = await TdLib.getChatHistory(chatId, 0, 40, 0);
const messages = history.map(it => JSON.parse(it.raw_json));

await TdLib.openChat(chatId); // MUST be called so TDLib treats the user as "viewing"
await TdLib.viewMessages(chatId, messages.map(m => m.id), false);
```

`viewMessages` uses `messageSourceChatHistory` internally — meaning TDLib will drop the unread counter and emit `updateChatReadInbox`.

## Sending a message, with reply

```ts
await TdLib.sendMessage(chatId, 'Hello');
await TdLib.sendMessage(chatId, 'Replying to a specific message', messageId);
```

## Reactions

```ts
await TdLib.addMessageReaction(chatId, messageId, '❤️');
await TdLib.removeMessageReaction(chatId, messageId, '❤️');

// Who reacted?
const r = await TdLib.getAddedReactions(chatId, messageId);
```

Watch `updateMessageInteractionInfo` to keep local state in sync when others react.

## Typing indicator

Outgoing — fire occasionally while the user types in your input:

```ts
TdLib.td_json_client_send({
  '@type': 'sendChatAction',
  chat_id: chatId,
  action: {'@type': 'chatActionTyping'},
});
```

Incoming — subscribe to `updateChatAction` and show "typing…" in the chat header:

```ts
emitter.addListener('tdlib-update', e => {
  if (e.type !== 'updateChatAction') return;
  const {chat_id, sender_id, action} = JSON.parse(e.raw);
  const isCancel = action['@type'] === 'chatActionCancel';
  // update your local "who is typing" map for chat_id / sender_id.user_id
});
```

TDLib sends `chatActionCancel` to clear; also apply a ~5s timeout as a safety net.

## Downloading files (fire-and-forget)

`TdLib.downloadFile(id)` waits for the download to complete before resolving — fine for one-off downloads, bad for long chat lists with 25+ avatars (blocks the bridge).

For UI previews, start the download and listen for progress:

```ts
TdLib.td_json_client_send({
  '@type': 'downloadFile',
  file_id: fileId,
  priority: 1,
  offset: 0,
  limit: 0,
  synchronous: false,
});

emitter.addListener('tdlib-update', e => {
  if (e.type !== 'updateFile') return;
  const {file} = JSON.parse(e.raw);
  if (file.id === fileId && file.local?.is_downloading_completed) {
    const uri = file.local.path.startsWith('file://')
      ? file.local.path
      : `file://${file.local.path}`;
    setLocalPath(uri); // <Image source={{uri}} />
  }
});
```

## Showing a photo bubble

Inside a TDLib message object (`content['@type'] === 'messagePhoto'`):

```ts
const photo = content.photo;                    // {sizes: [...], minithumbnail: {...}}
const size  = photo.sizes?.find(s => s.type === 'x') ?? photo.sizes?.[0];
const fileId = size?.photo?.id;

// Trigger download as above. While waiting, show the minithumbnail:
const placeholder = photo.minithumbnail?.data
  ? `data:image/jpeg;base64,${photo.minithumbnail.data}`
  : undefined;
```

## Options

```ts
await TdLib.setOption('online', {type: 'boolean', value: true});

const version = await TdLib.getOption('version');
// '1.8.51', etc. All values are returned as strings.
```

Available types: `string`, `integer`, `boolean`, `empty` (reset a previously set option).

## Searching chats

```ts
const raw = await TdLib.searchChats('Durov', 10);
const results = JSON.parse(raw); // array of full chat objects
```

Use `searchPublicChat(username)` for exact `@username` lookups.

## Executing synchronous TDLib functions

Some TDLib functions don't need the client (they're pure helpers). Use `td_json_client_execute`:

```ts
const res = await TdLib.td_json_client_execute({
  '@type': 'getTextEntities',
  text: 'Check @telegram and https://telegram.org',
});
const entities = JSON.parse(res).entities;
```

## Calling anything TDLib supports

If a function isn't yet wrapped with a dedicated method, use `td_json_client_send` — it's fire-and-forget, and the response (or update) arrives via the usual `tdlib-update` stream:

```ts
TdLib.td_json_client_send({
  '@type': 'setChatTitle',
  chat_id: chatId,
  title: 'New title',
});
```

See the [TDLib API docs](https://core.telegram.org/tdlib/docs/td__api_8h.html) for the full list.
