# site

Marketing landing for [`react-native-tdlib`](../). Deployed to GitHub Pages
via `.github/workflows/site.yml` on every push to `master` that touches
`site/**` or `docs/**`.

## Stack

- Next.js 16 (App Router, static export)
- Tailwind CSS v4
- Shiki for code highlighting
- `motion/react` for scroll reveals
- `next-themes` for light/dark
- OG image generated at build time via `next/og`

## Scripts

```bash
npm install
npm run dev     # http://localhost:3000/react-native-tdlib/
npm run build   # static export to ./out
```

To test from another device on the LAN in dev:

```bash
ALLOWED_DEV_ORIGINS=192.168.x.x,10.0.x.x npm run dev
```

## Deploy

The workflow runs `npm ci && npm run build` and publishes `site/out` via
`actions/deploy-pages@v4`. Pages source must be set to **GitHub Actions** in
repository settings.

## Content sources

- Hero video: built from `../docs/images/example.gif` into `public/example.{mp4,webm}` + poster.
- Release version + date: parsed from `../CHANGELOG.md` at build time (see `lib/release.ts`).
- Star count: fetched unauthenticated from the GitHub API at build time (see `lib/github.ts`).
