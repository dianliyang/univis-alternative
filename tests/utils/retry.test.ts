import { describe, expect, it, vi } from "vitest";
import { retryAsync } from "../../src/utils/retry.js";

describe("retryAsync", () => {
  it("retries transient failures up to the configured attempt limit", async () => {
    let attempts = 0;
    const delay = vi.fn(async () => {});

    const result = await retryAsync(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("temporary failure");
        }
        return "ok";
      },
      {
        maxAttempts: 3,
        shouldRetry: () => true,
        delay
      }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(delay).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient failures", async () => {
    let attempts = 0;
    const delay = vi.fn(async () => {});

    await expect(
      retryAsync(
        async () => {
          attempts += 1;
          throw new Error("permanent failure");
        },
        {
          maxAttempts: 3,
          shouldRetry: () => false,
          delay
        }
      )
    ).rejects.toThrow("permanent failure");

    expect(attempts).toBe(1);
    expect(delay).not.toHaveBeenCalled();
  });
});
