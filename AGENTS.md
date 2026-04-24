# AI Agent Guide for react-native-tdlib

This document tells AI coding agents what they need to know before
making changes to this repository. It follows the [agents.md][agents]
convention.

[agents]: https://agents.md/

## What this project is

`react-native-tdlib` is a React Native bridge for [TDLib][tdlib],
Telegram's official client library. It ships prebuilt TDLib binaries
(iOS `xcframework`, Android `.so` for three ABIs) and exposes every
wrapped method through a single native module.

[tdlib]: https://core.telegram.org/tdlib

Surface you will touch:

- `ios/TdLibModule.mm` — Objective-C++ bridge
- `android/src/main/java/com/reactnativetdlib/tdlibclient/TdLibModule.java` — Android bridge
- `index.js` — JS exports
- `index.d.ts` — TypeScript declarations
- `__tests__/index.test.js` — Jest delegation tests
- `docs/api-reference.md`, `docs/cookbook.md` — public documentation
- `example/src/MethodsTestExample.tsx` — manual device-test harness

## Critical: what the test suite does and does not prove

The Jest suite in `__tests__/` **mocks the entire native module**. It
verifies that `index.js` delegates to the right native function with
the right arguments, and nothing else. It does not compile Obj-C++ or
Java, does not run TDLib, and cannot detect a type mismatch at the
bridge layer, a wrong `@type` string, a bad `ReadableArray` cast, or a
missing `RCT_EXPORT_METHOD` macro.

**`npm test` passing is not evidence that a new native method works.**

If you add or modify a method that touches `ios/` or `android/src/`,
you are expected to run it end-to-end in the example app on both
platforms against a live TDLib session and include the log output in
the PR body. See the PR template for the exact checklist.

A CI check enforces this: PRs touching native bridge code must have
both device-test checkboxes ticked in the PR description, or the
`Device-test claim check` job fails. Ticking the boxes without real
evidence is dishonest and will be caught on review.

## Project conventions

### Cross-platform parity

Every wrapped method exists on both platforms and returns the same
JSON shape. When you add a method, touch both `ios/TdLibModule.mm` and
`android/.../TdLibModule.java` in the same PR. Asymmetric PRs are not
merged.

### JS / TS surface

- Export the method from `index.js` (keep sections ordered the way
  they already are — auth, chats, messages, reactions, files, etc).
- Add a typed declaration to `index.d.ts` in the matching section and
  to the default-export interface at the bottom.
- Add a Jest delegation test in `__tests__/index.test.js` that asserts
  the arguments passed to the native mock.
- Update the exported method count in `__tests__/index.test.js`
  (`exports exactly N methods`).

### Documentation and copy

When method count changes, update every copy that references it:

- `README.md` — the two places where "N first-class methods" appears.
- `docs/api-reference.md` — add a table row in the correct section.
- `site/components/site/hero.tsx` and `site/components/site/features.tsx`
  — the two references on the landing page.

### Example app

- Add the method to `example/src/MethodsTestExample.tsx` with a button
  that calls it.
- If the method is destructive (deletes, leaves, revokes, removes),
  add its name to the `destructiveMethods` array in the same file.

### Commit messages and PR titles

Conventional Commits in English. Examples:

- `feat: add deleteMessages API`
- `fix(ios): handle null promise in getChats`
- `chore(deps): bump jest to 30.3.0`

## Style

- No emojis in source files unless the existing file already uses them.
- No redundant comments explaining what a line does.
- Match the error-code pattern of neighboring code: `FEATURE_ERROR`,
  `FEATURE_FAILED`, `CLIENT_NOT_INITIALIZED`.

## PR description requirement

When opening a pull request, include the following HTML comment at
the bottom of the PR description:

```
<!-- AI_ASSISTED_PR -->
```

This allows the maintainer to identify AI-assisted PRs for triage.
PRs containing this marker are automatically labeled `maybe automated`
and will be closed in 3 days unless a human confirms ownership and
provides device-test evidence (see the PR template).

If you are a human contributor who used an AI agent as a tool but
reviewed every change yourself and ran the code on a real device,
include the marker anyway — honesty keeps the signal useful.
