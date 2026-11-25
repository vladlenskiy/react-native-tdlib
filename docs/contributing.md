# Contributing

Thanks for wanting to contribute! This library is open-source and community-driven.

## Project layout

```
.
├── index.js / index.d.ts     ← JS bridge + public types
├── ios/                      ← Objective-C++ native module + xcframework
├── android/                  ← Java native module + jniLibs
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

# TDLib credentials for the example app
cp .env.example .env
# set TDLIB_API_ID and TDLIB_API_HASH from https://my.telegram.org/apps
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

The Jest suite mocks the native module. It checks that each function in `index.js` calls the right native method with the right arguments. It does not compile the iOS or Android code and does not run TDLib, so a passing `npm test` says nothing about whether a native change works. For that, run the method in the example app on a device (see below).

### Typechecking

```bash
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
   - Add the method name to the Jest mock in [`__tests__/index.test.js`](../__tests__/index.test.js), add a delegation test, and bump the `exports exactly N methods` count.

3. **Docs**
   - Add a row to the right table in [`docs/api-reference.md`](./api-reference.md).
   - Consider a recipe in [`docs/cookbook.md`](./cookbook.md) if the call is non-obvious.
   - Update the method count in [`README.md`](../README.md) and on the landing page (`site/components/site/`).

4. **Example**
   - Add a test row in [`example/src/MethodsTestExample.tsx`](../example/src/MethodsTestExample.tsx) so the Debug tab exercises it.
   - If the method deletes, leaves, revokes or removes something, add it to `destructiveMethods` in the same file.

5. **Device test**
   - Run the method from the Debug tab on iOS and on Android against a live TDLib session.
   - Paste both logs into the PR under "Device logs" and tick the two device-test boxes. A CI check fails PRs that touch `ios/` or `android/src/` without them.

Contributions written with an AI agent are welcome. Tick the disclosure box in the PR template; [AGENTS.md](../AGENTS.md) explains what happens next.

## Style

- Don't add dependencies. The library is zero-dep on purpose.
- Don't leak native errors — always map to a stable JS error code and message.
- Prefer fire-and-forget for anything called from hot paths (list rendering, typing) — heavy waiting is a lag waiting to happen.

## Releasing

Maintainer only, from an up-to-date `master` with a clean working tree:

```bash
npm run release
```

[release-it](https://github.com/release-it/release-it) suggests the next version from the Conventional Commits since the last tag, updates `package.json` and `CHANGELOG.md`, commits, and pushes a `v*` tag. The tag triggers [`release.yml`](../.github/workflows/release.yml), which runs the tests, publishes to npm through Trusted Publishing with provenance, and creates the GitHub Release. The podspec reads its version from `package.json`.

The prebuilt binaries in `ios/Libraries/tdjson/` and `android/src/main/jniLibs/` are checked into the repo and shipped via the npm tarball — no separate build step needed at publish time.

## Code of conduct

Be kind. We review PRs on our own time.
