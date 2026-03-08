import { describe, expect, it } from "vitest";
import { readResponseText } from "../../src/utils/http-text.js";

describe("readResponseText", () => {
  it("falls back to windows-1252 when html without charset would decode as utf-8 replacement characters", async () => {
    const bytes = Uint8Array.from([
      ...Buffer.from("<html><head><title>x</title></head><body>Zentrum f", "ascii"),
      0xfc,
      ...Buffer.from("r Molekulare Biowissenschaften</body></html>", "ascii")
    ]);

    const response = new Response(bytes, {
      headers: {
        "content-type": "text/html"
      }
    });

    await expect(readResponseText(response)).resolves.toContain("Zentrum für Molekulare Biowissenschaften");
  });

  it("respects an explicit utf-8 charset when present", async () => {
    const response = new Response("Walther Schöcking", {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });

    await expect(readResponseText(response)).resolves.toBe("Walther Schöcking");
  });
});
