# Contributing

Thanks for wanting to contribute! This library is open-source and community-driven.

## Project layout

```
.
├── index.js / index.d.ts     ← JS bridge + public types
├── ios/                      ← Objective-C++ native module + xcframework
├── android/                  ← Kotlin/Java native module + jniLibs
├── __tests__/                ← Jest tests for the JS bridge
├── example/                  ← Reference app (Telegram-like client)
└── docs/                     ← User documentation
```

## Local development

### One-time setup

```bash
# Root (library)
npm install

# Example app
cd example
npm install
cd ios && pod install && cd ..
```

### Running the example

```bash
cd example
npm start                      # start Metro
npx react-native run-ios       # in another tab
npx react-native run-android   # or for Android
```

The example app auto-links the library from the repo root via `metro.config.js` watchFolders — no symlinks, no `npm link`.

### Running the tests

```bash
npm test
```

The Jest suite verifies the JS ↔ native contract: every exposed method must be on both the JS `index.js` and the native module.

### Typechecking

```bash
# library
npx tsc --noEmit -p tsconfig.json   # (if one exists) — otherwise skip
# example app
cd example && npx tsc --noEmit
```

## Adding a new method

1. **Native**
   - Add an `RCT_EXPORT_METHOD` on iOS ([`ios/TdLibModule.mm`](../ios/TdLibModule.mm)).
   - Add a matching `@ReactMethod` on Android ([`android/…/TdLibModule.java`](../android/src/main/java/com/reactnativetdlib/tdlibclient/TdLibModule.java)).
   - Keep signatures identical across platforms (same argument order and types). If promising a `TdRawResult`, use `sendTdLibRequestWithRawResult` on iOS and `result.putString("raw", gson.toJson(object))` on Android.

2. **JS glue**
   - Add the method to [`index.js`](../index.js).
   - Add typed signature to [`index.d.ts`](../index.d.ts).
   - Add the method name to the Jest mock in [`__tests__/index.test.js`](../__tests__/index.test.js).

3. **Docs**
   - Add a row to the right table in [`docs/api-reference.md`](./api-reference.md).
   - Consider a recipe in [`docs/cookbook.md`](./cookbook.md) if the call is non-obvious.

4. **Example**
   - Add a test row in [`example/src/MethodsTestExample.tsx`](../example/src/MethodsTestExample.tsx) so the Debug tab exercises it.

## Style

- Don't add dependencies. The library is zero-dep on purpose.
- Don't leak native errors — always map to a stable JS error code and message.
- Prefer fire-and-forget for anything called from hot paths (list rendering, typing) — heavy waiting is a lag waiting to happen.

## Releasing

Maintainer only:

```bash
npm version patch   # or minor / major
git push --follow-tags
npm publish
```

The prebuilt binaries in `ios/Libraries/tdjson/` and `android/src/main/jniLibs/` are checked into the repo and shipped via the npm tarball — no separate build step needed at publish time.

## Code of conduct

Be kind. We review PRs on our own time.
