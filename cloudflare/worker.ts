import { buildPublishedDataKey, resolvePublishedDataFile } from "../src/cloudflare/data.js";

interface AssetFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface R2ObjectLike {
  body: ReadableStream<Uint8Array> | null;
  httpEtag?: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
}

export interface Env {
  ASSETS: AssetFetcher;
  DATA_BUCKET?: R2BucketLike;
  DATA_PREFIX?: string;
  SYNC_WEBHOOK_URL?: string;
  SYNC_WEBHOOK_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const dataFile = resolvePublishedDataFile(url.pathname);

    if (dataFile) {
      return servePublishedData(request, env, dataFile);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.SYNC_WEBHOOK_URL) {
      console.log("Skipping sync: SYNC_WEBHOOK_URL is not configured.");
      return;
    }

    ctx.waitUntil(triggerSync(env, controller.scheduledTime));
  }
};

async function servePublishedData(request: Request, env: Env, dataFile: string): Promise<Response> {
  const bucket = env.DATA_BUCKET;
  if (bucket) {
    const object = await bucket.get(buildPublishedDataKey(dataFile, env.DATA_PREFIX ?? "latest"));
    if (object?.body) {
      const headers = new Headers({
        "cache-control": "public, max-age=300",
        "content-type": "application/json; charset=utf-8"
      });
      object.writeHttpMetadata(headers);
      if (object.httpEtag) {
        headers.set("etag", object.httpEtag);
      }
      return new Response(object.body, { headers });
    }
  }

  const fallbackUrl = new URL(`/data/${dataFile}`, request.url);
  return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
}

async function triggerSync(env: Env, scheduledTime: number): Promise<void> {
  const headers = new Headers({
    "content-type": "application/json"
  });

  if (env.SYNC_WEBHOOK_TOKEN) {
    headers.set("authorization", `Bearer ${env.SYNC_WEBHOOK_TOKEN}`);
  }

  const response = await fetch(env.SYNC_WEBHOOK_URL!, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "cloudflare-cron",
      scheduledTime
    })
  });

  if (!response.ok) {
    throw new Error(`Sync webhook failed with ${response.status}`);
  }
}
