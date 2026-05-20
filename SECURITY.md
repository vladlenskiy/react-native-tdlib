# Security Policy

## Reporting a Vulnerability

If you've found a security issue in `react-native-tdlib`, please **do not open a
public GitHub issue**. Use one of the private channels below instead.

**Preferred — GitHub Security Advisories (private):**
[Report a vulnerability](https://github.com/vladlenskiy/react-native-tdlib/security/advisories/new)

**Backup — email:**
`vkaveev@outlook.com`

This project is maintained by a single person, so please be patient. Realistic
response timeline:

- **Acknowledgment** within 72 hours
- **Initial assessment** within 7 days
- **Fix or mitigation** depending on severity — high-severity issues get
  priority and a release as soon as a patch is verified

For any of those, expect them sooner in practice, but those are the
commitments.

## Scope

### In scope

Vulnerabilities in the parts of the library I own and ship:

- The JavaScript layer (`index.js`, `index.d.ts`)
- The iOS native bridge (`ios/TdLibModule.h`, `ios/TdLibModule.mm`)
- The Android native bridge (`android/src/`)
- The build pipeline (npm publish, GitHub Actions release workflow)
- The pre-built `libtdjson.xcframework` shipped for iOS — only insofar as
  the build process I run can be attacked. Bugs in TDLib's source itself
  are out of scope, see below.
- The `package.json` `files` allowlist, `release-it` configuration, and
  related supply-chain surface

### Out of scope

- Vulnerabilities in the upstream TDLib library itself
  ([tdlib/td](https://github.com/tdlib/td)) — please report those to the
  Telegram team
- Vulnerabilities in the Telegram service, Telegram apps, or the
  Telegram API
- Misuse of the library in consumer applications that the application
  itself is responsible for (e.g., logging an API hash to disk)
- Issues in `react`, `react-native`, or any other consumer-provided
  peer dependency
- Denial-of-service through legitimate API usage (e.g., calling
  `getChatHistory` with very large limits)
- Reports without a reproducible scenario

## Supported Versions

Security updates are issued only for the latest release of `react-native-tdlib`.
Older versions are not maintained.

| Version | Supported |
|---------|-----------|
| Latest `2.x` release | ✅ |
| Older versions | ❌ |

If you're on an older version, upgrading is the recommended fix path.

## Disclosure Process

1. You report privately (advisory or email).
2. I acknowledge within 72 hours.
3. I investigate and assess severity within 7 days.
4. If valid, I work on a fix. For high-severity issues, I aim for a release
   within 14 days of confirmation; lower-severity issues may take longer.
5. We coordinate a disclosure date. The default is **7 days after the patch
   release** to give downstream users time to update.
6. I credit you in the release notes and the published GitHub Security
   Advisory — unless you prefer to remain anonymous.

If you believe a vulnerability is being actively exploited in the wild,
say so in your first message. Active exploitation changes the urgency
calculus and I will treat it accordingly.

## What I Can't Promise

This project is maintained by one person in their non-work hours. I can't
promise enterprise-grade response times, bug bounties, or a dedicated
security team. What I can promise is honest communication, good-faith
investigation, and a patch as soon as is practically possible.

## Hardening Already in Place

A short summary of what's already done on the project side, for reporters
to understand the existing baseline:

- Zero production dependencies (only `peerDependencies` for `react` and
  `react-native`)
- Explicit `files` allowlist in `package.json`; no `.npmignore` shadow
- 2FA enforced on GitHub and npm
- Releases run only from GitHub Actions, never from a developer machine
- npm Trusted Publishing via OIDC — no long-lived npm tokens exist
- `npm publish --provenance` for sigstore-based attestation
- `yarn install --frozen-lockfile` in CI for deterministic install
- Dependabot weekly scans
- Branch protection requires approval for bot PRs

## Acknowledgments

Thanks in advance to anyone who takes the time to report responsibly.

---

*Last updated: 2026-05-20*
