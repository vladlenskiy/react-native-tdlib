## Summary

<!-- What does this PR do and why? -->

## Testing

- [ ] `npm test -- --runInBand` passes

**For PRs that add or modify native methods (`ios/` or `android/`):**

- [ ] Ran the method in `example/` on iOS against a live TDLib session — log attached below
- [ ] Ran the method in `example/` on Android against a live TDLib session — log attached below

<details>
<summary>Device logs</summary>

```
<!-- paste MethodsTestExample output here, iOS and Android -->
```

</details>

## Checklist for new / changed methods

- [ ] iOS (`ios/TdLibModule.mm`) and Android (`android/.../TdLibModule.java`) implementations are equivalent
- [ ] `index.js`, `index.d.ts`, `__tests__/index.test.js` updated
- [ ] `docs/api-reference.md` (and `docs/cookbook.md` if relevant) updated
- [ ] Method count bumped consistently across `README.md` and `site/components/site/`
- [ ] Destructive methods added to `destructiveMethods` in `example/src/MethodsTestExample.tsx`

<!-- If this PR was written with meaningful AI agent assistance, keep the marker below. See AGENTS.md. -->
<!-- AI_ASSISTED_PR -->
