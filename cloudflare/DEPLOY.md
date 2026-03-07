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
- published JSON data in `site/public/data`

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
npm run cf:build
npm run cf:publish-data
npm run cf:deploy
```

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
