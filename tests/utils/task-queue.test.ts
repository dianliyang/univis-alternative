import { describe, expect, it } from "vitest";
import { createTaskQueue } from "../../src/utils/task-queue.js";

describe("task queue", () => {
  it("limits parallel work to the configured window size", async () => {
    const queue = createTaskQueue(2);
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        queue.run(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5 + index));
          active -= 1;
          return index;
        })
      )
    );

    expect(peak).toBe(2);
  });
});
