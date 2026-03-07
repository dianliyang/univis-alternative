import { describe, expect, it, vi } from "vitest";
import { loadPublishedJson } from "../../site/components/data-source.js";

describe("published data loader", () => {
  it("prefers the Cloudflare API endpoint when available", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: "api" }), { status: 200, headers: { "content-type": "application/json" } }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublishedJson<{ ok: string }>("manifest.json")).resolves.toEqual({ ok: "api" });
    expect(fetchMock).toHaveBeenCalledWith("/api/data/manifest.json");
  });

  it("falls back to the static data path when the API is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: "fallback" }), { status: 200, headers: { "content-type": "application/json" } })
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublishedJson<{ ok: string }>("catalog.json")).resolves.toEqual({ ok: "fallback" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/data/catalog.json");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/data/catalog.json");
  });
});
