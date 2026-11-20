import {
  applyAdjustments,
  applyWatermark,
  compressImage,
  convertFormat,
  compressToTargetSize,
  cropImage,
  resizeImage,
} from './imageService';

/**
 * Pipeline steps are plain, structured-cloneable objects so the same description can run
 * on the main thread or inside a Web Worker:
 *   { type: 'convert', format, quality }          quality is 0-100
 *   { type: 'compress', quality }
 *   { type: 'resize', width, height, maintainAspect, quality?, options? }   options: { mode, percentage }
 *   { type: 'target-size', bytes }                 exports JPEG at the best quality that fits
 *   { type: 'crop', preset }
 *   { type: 'rotate', degrees, flipH, flipV }
 *   { type: 'watermark', text, opacity }
 *   { type: 'filter', filter }  |  { type: 'grayscale' }  |  { type: 'sepia' }
 */
const runners = {
  convert: (file, step, ctx) =>
    convertFormat(file, step.format, step.quality == null ? undefined : step.quality / 100, { preserveMetadata: !!ctx.preserveMetadata }),
  compress: (file, step) => compressImage(file, step.quality / 100),
  resize: (file, step) =>
    resizeImage(file, step.width, step.height, step.maintainAspect, (step.quality ?? 92) / 100, step.options),
  'target-size': (file, step) => compressToTargetSize(file, step.bytes),
  crop: (file, step) => cropImage(file, { preset: step.preset }),
  rotate: (file, step) =>
    applyAdjustments(file, { rotate: step.degrees, flipH: step.flipH, flipV: step.flipV }),
  watermark: (file, step) =>
    applyWatermark(file, { type: 'text', text: step.text, opacity: step.opacity, position: 'bottom-right' }),
  filter: (file, step) => applyAdjustments(file, { [step.filter]: true }),
  grayscale: (file) => applyAdjustments(file, { grayscale: true, quality: 0.92 }),
  sepia: (file) => applyAdjustments(file, { sepia: true, quality: 0.92 }),
};

export const STEP_TYPES = Object.keys(runners);

/** Runs steps in order, feeding each output into the next step. Returns the last step's result. */
export async function runPipeline(file, steps, ctx = {}) {
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('Add at least one processing step.');
  let current = file;
  let result;
  for (const step of steps) {
    const run = runners[step?.type];
    if (!run) throw new Error(`Unknown processing step: ${step?.type}`);
    result = await run(current, step, ctx);
    current = new File([result.blob], result.name, { type: result.blob.type || current.type });
  }
  return result;
}
