# Cloudflare Deployment

This repo is set up to deploy as a Cloudflare Worker with static assets and R2-backed published data.

## Prerequisites

- A Cloudflare account
- A Worker named `univis-alternative`
- An R2 bucket named `univis-alternative-data`
- Wrangler authenticated locally:

```bash
npx wrangler login
```

## Build

```bash
npm run cf:build
```

This produces:

- static assets in `site/.vitepress/dist`
- published JSON data in `site/docs/public/data`

`npm run cf:build` only rebuilds from existing local crawl data, but it refreshes bilingual tree artifacts first.

If you need fresh remote crawl data first, run:

```bash
npm run fetch:data
```

`npm run build:data` runs `npm run prepare:trees` before parsing, normalization, and generation.

Run `npm run fetch:data` before `npm run build:data` when you need fresh remote crawl data.

## Publish Data To R2

Default bucket/prefix:

- bucket: `univis-alternative-data`
- prefix: `latest/`

```bash
npm run cf:publish-data
```

Custom bucket or prefix:

```bash
npm run cf:publish-data -- my-bucket snapshots/2025w
```

The script uploads:

- `catalog.json`
- `faculty-browser.json`
- `faculty-summary.json`
- `manifest.json`
- `search-index.json`

## Deploy Worker

```bash
npm run cf:deploy
```

## End-to-End

```bash
npm run fetch:data
npm run cf:build
npm run cf:publish-data
npm run cf:deploy
```

## Remote Manual Deploy

The repo also includes a manual GitHub Actions workflow at `.github/workflows/deploy-cloudflare.yml`.
There is also a separate manual tree refresh workflow at `.github/workflows/refresh-trees.yml`.

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow runs these commands remotely:

```bash
npm run fetch:data
npm run cf:build
npm run cf:publish-data
npm run cf:deploy
```

The workflow also uses a GitHub Actions cache for:

- `data/discovery`
- `data/raw`
- `data/normalized`

That lets repeated manual runs reuse crawl snapshots and normalized tree artifacts instead of starting cold every time.

Use `refresh-trees.yml` when you explicitly want to rebuild bilingual lecture and organization tree artifacts.
Use `deploy-cloudflare.yml` for the normal remote deploy path.

To use it:

1. Add the required GitHub repository secrets.
2. Open the repository Actions tab.
3. Select either `Refresh Trees` or `Deploy Cloudflare`.
4. Click `Run workflow`.

## Scheduled Sync

The Worker has a daily cron trigger in [`wrangler.jsonc`](../wrangler.jsonc).

To use it, configure:

- `SYNC_WEBHOOK_URL`
- optional `SYNC_WEBHOOK_TOKEN`

Example:

```bash
npx wrangler secret put SYNC_WEBHOOK_URL
npx wrangler secret put SYNC_WEBHOOK_TOKEN
```

The cron job currently triggers that webhook; it does not yet run the full UnivIS retrieval pipeline inside the Worker runtime.
