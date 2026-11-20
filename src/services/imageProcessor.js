import { runPipeline } from './imageOps';

const IDLE_TIMEOUT_MS = 10_000;
const MAX_WORKERS = 4;

function poolSize() {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  return Math.max(1, Math.min(MAX_WORKERS, cores - 1));
}

const canUseWorkers = () =>
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';

class WorkerPool {
  constructor() {
    this.workers = [];
    this.idle = [];
    this.waiting = [];
    this.pending = new Map();
    this.nextId = 1;
    this.idleTimer = null;
    this.broken = false;
  }

  createWorker() {
    const worker = new Worker(new URL('../workers/image.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const { id, ok, result, error } = event.data;
      const task = this.pending.get(id);
      if (!task) return;
      this.pending.delete(id);
      this.release(worker);
      if (ok) {
        task.resolve(result);
      } else {
        const failure = new Error(error.message);
        failure.code = error.code;
        task.reject(failure);
      }
    };
    worker.onerror = () => {
      // The worker script failed to load or crashed: stop using workers and let callers fall back.
      this.broken = true;
      const failure = new Error('Background worker failed.');
      failure.code = 'WORKER_FAILED';
      for (const [id, task] of this.pending) {
        if (task.worker === worker) {
          this.pending.delete(id);
          task.reject(failure);
        }
      }
      this.workers = this.workers.filter((candidate) => candidate !== worker);
      worker.terminate();
    };
    this.workers.push(worker);
    return worker;
  }

  acquire() {
    clearTimeout(this.idleTimer);
    const worker = this.idle.pop();
    if (worker) return Promise.resolve(worker);
    if (this.workers.length < poolSize()) return Promise.resolve(this.createWorker());
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  release(worker) {
    const next = this.waiting.shift();
    if (next) {
      next(worker);
      return;
    }
    this.idle.push(worker);
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.shutdown(), IDLE_TIMEOUT_MS);
  }

  shutdown() {
    if (this.pending.size > 0 || this.waiting.length > 0) return;
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.idle = [];
  }

  async run(file, steps, ctx) {
    const worker = await this.acquire();
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject, worker });
      worker.postMessage({ id, file, steps, ctx });
    });
  }
}

let pool;

/**
 * Runs one image through a pipeline on a background worker. If workers or OffscreenCanvas are
 * unavailable, or the file needs DOM-only decoding (HEIC), it transparently runs on the main thread.
 */
export async function processImage(file, steps, ctx = {}) {
  if (canUseWorkers() && !pool?.broken) {
    pool ??= new WorkerPool();
    try {
      return await pool.run(file, steps, ctx);
    } catch (error) {
      if (error.code !== 'MAIN_THREAD_ONLY' && error.code !== 'WORKER_FAILED') throw error;
    }
  }
  // Main-thread fallback: yield first so the UI can repaint between files.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return runPipeline(file, steps, ctx);
}

/**
 * Processes many files in parallel. Resolves with one entry per input file, in input order:
 *   { status: 'done', ...result }  |  { status: 'error', error }  |  { status: 'cancelled' }
 * It never rejects because of a single file failure.
 *
 * `steps` is either one pipeline for every file, or a function (file) => steps for per-file pipelines.
 * options: { signal, onStart(index, file), onProgress(done, total, name, index, result) }
 * Aborting the signal stops starting new files; files already being processed finish normally.
 */
export async function processImages(files, steps, ctx = {}, options = {}) {
  // Backwards compatible: processImages(files, steps, ctx, onProgressFunction)
  const { signal, onStart, onProgress } = typeof options === 'function' ? { onProgress: options } : options;
  const results = new Array(files.length);
  let completed = 0;
  let cursor = 0;
  const concurrency = canUseWorkers() && !pool?.broken ? poolSize() : 1;
  const stepsFor = typeof steps === 'function' ? steps : () => steps;

  const lane = async () => {
    while (cursor < files.length) {
      const index = cursor++;
      if (signal?.aborted) {
        results[index] = { status: 'cancelled' };
        continue;
      }
      onStart?.(index, files[index]);
      try {
        results[index] = { ...(await processImage(files[index], stepsFor(files[index]), ctx)), status: 'done' };
      } catch (error) {
        results[index] = { status: 'error', error: error?.message || 'Processing failed.' };
      }
      completed += 1;
      onProgress?.(completed, files.length, files[index].name, index, results[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, lane));
  return results;
}
