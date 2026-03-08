# UnivIS - CAU

A simpler public browser for CAU Kiel lecture data from `https://univis.uni-kiel.de`.

The site keeps the public UnivIS structure, but makes it easier to browse through:

- institutions
- lecture-directory categories
- generated lecture detail pages

## What It Does

- crawls allowed public UnivIS pages under `/form`
- builds normalized lecture and organization data
- generates a static VitePress site
- publishes browser data for institutions and lectures
- links back to the original UnivIS pages where needed

## Browsing Modes

- `Institutions`: browse from faculties, institutes, centers, and other units
- `Lectures`: browse from lecture-directory categories such as degree programs and catalog sections

## Commands

- `npm run discover`
- `npm run crawl`
- `npm run fetch:data`
- `npm run prepare:trees`
- `npm run parse`
- `npm run normalize`
- `npm run generate`
- `npm run build:data`
- `npm run build:site`
- `npm run build`
- `npm run dev`

## Cloudflare

The repo includes a Cloudflare Worker entrypoint at [cloudflare/worker.ts](./cloudflare/worker.ts) and configuration in [wrangler.jsonc](./wrangler.jsonc).

- static site assets are served from `site/.vitepress/dist`
- published JSON data is read from R2 under `latest/`
- the UI prefers `/api/data/*.json` and falls back to local `/data/*.json` for development

Typical deployment flow:

1. `npm run fetch:data` when you want fresh remote data
2. `npm run cf:build` rebuilds from existing local data after refreshing tree artifacts
3. `wrangler deploy`
4. upload published JSON artifacts to the R2 bucket under `latest/`

Exact deployment commands are documented in [cloudflare/DEPLOY.md](./cloudflare/DEPLOY.md).

There is also a manual GitHub Actions workflow for remote deploys so fetch/build traffic does not have to come from a local IP.

## License

MIT. See [LICENSE](./LICENSE).
