# UnivIS Kiel Static Catalog

Static, read-only course browser for `https://univis.uni-kiel.de`.

## Goals

- Crawl allowed public UnivIS pages under `/form`
- Never touch `/prg`
- Build normalized course data and a VitePress catalog
- Make English-taught courses easy to find

## Commands

- `npm run discover`
- `npm run crawl`
- `npm run parse`
- `npm run normalize`
- `npm run generate`
- `npm run build`

## Cloudflare

The repo now includes a Cloudflare Worker entrypoint at [`cloudflare/worker.ts`](./cloudflare/worker.ts) and [`wrangler.jsonc`](./wrangler.jsonc).

- Static site assets are served from `site/.vitepress/dist`
- Published JSON data is read from R2 under `latest/`
- The UI prefers `/api/data/*.json` and falls back to local `/data/*.json` for local development
- A daily cron trigger is configured; by default it calls `SYNC_WEBHOOK_URL` if you set one

Typical deployment flow:

1. `npm run build:data`
2. `npm run build:site`
3. `wrangler deploy`
4. Upload `site/public/data/*.json` to the R2 bucket path `latest/`

The current Worker deployment path is ready for Cloudflare-hosted serving. The full UnivIS retrieval pipeline itself is still Node-based and should be run by a separate scheduled job/webhook target until it is ported to Cloudflare-native runtime.

Exact Cloudflare commands are documented in [cloudflare/DEPLOY.md](./cloudflare/DEPLOY.md).
