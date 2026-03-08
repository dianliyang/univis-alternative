export interface TaskQueue {
  run<T>(task: () => Promise<T>): Promise<T>;
}

export function createTaskQueue(concurrency: number): TaskQueue {
  const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 1;
  let activeCount = 0;
  const waiting: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (activeCount < limit) {
      activeCount += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      waiting.push(() => {
        activeCount += 1;
        resolve();
      });
    });
  }

  function release(): void {
    activeCount -= 1;
    const next = waiting.shift();
    if (next) {
      next();
    }
  }

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    }
  };
}
