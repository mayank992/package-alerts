type Options = {
  concurrency?: number;
};

export class ConcurrentTask {
  private running: number = 0;
  private readonly concurrency: number;
  private readonly queue: (() => Promise<void>)[] = [];

  constructor({ concurrency = 10 }: Options) {
    this.concurrency = concurrency;
  }

  private async processQueue() {
    while (this.queue.length > 0 && this.running < this.concurrency) {
      const task = this.queue.shift();

      this.running++;

      task().finally(() => {
        this.running--;
        this.processQueue();
      });
    }
  }

  async enqueue(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }
}
