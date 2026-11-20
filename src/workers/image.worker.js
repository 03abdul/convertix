// Runs image pipelines off the main thread so large batches never freeze the UI.
import { runPipeline } from '@/services/imageOps';

self.onmessage = async (event) => {
  const { id, file, steps, ctx } = event.data;
  try {
    const result = await runPipeline(file, steps, ctx);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: { message: error?.message || 'Image processing failed.', code: error?.code },
    });
  }
};
