import { useState } from 'react';
import { Zap } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import Panel from '@/components/ui/Panel';
import Segmented from '@/components/ui/Segmented';
import Disclosure from '@/components/ui/Disclosure';
import { NumberInput, Select, Slider, Toggle } from '@/components/ui/Controls';
import { useImageBatch } from '@/hooks/useImageBatch';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { usePersistentState } from '@/hooks/usePersistentState';
import { SOCIAL_MEDIA_PRESETS } from '@/services/imageService';
import { IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { formatBytes, pluralize } from '@/utils/format';

const resizePresets = [
  { label: 'Custom', width: 1080, height: 1080 },
  { label: 'Instagram portrait', width: 1080, height: 1350 },
  { label: 'Instagram square', width: 1080, height: 1080 },
  { label: 'Full HD', width: 1920, height: 1080 },
  { label: 'HD', width: 1280, height: 720 },
  ...Object.entries(SOCIAL_MEDIA_PRESETS).map(([label, dimensions]) => ({
    label: label.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()),
    ...dimensions,
  })),
];

const QUALITY_PRESETS = [
  { value: 90, label: 'Light' },
  { value: 70, label: 'Balanced' },
  { value: 45, label: 'Strong' },
];

const MODES = [
  { value: 'compress', label: 'Compress' },
  { value: 'target-size', label: 'Target size' },
  { value: 'resize', label: 'Resize' },
];

function CompareResult({ file, row }) {
  const beforeUrl = useObjectUrl(file);
  const afterUrl = useObjectUrl(row.blob);
  if (!beforeUrl || !afterUrl) return <SkeletonRegion label="Preparing comparison"><Skeleton className="h-[min(60vh,420px)] w-full rounded-xl" /></SkeletonRegion>;
  return (
    <BeforeAfterSlider
      before={beforeUrl}
      after={afterUrl}
      beforeLabel={`Original · ${formatBytes(row.originalSize)}`}
      afterLabel={`Optimized · ${formatBytes(row.newSize)}`}
    />
  );
}

export default function ImageOptimizer() {
  const [prefs, setPrefs] = usePersistentState('convertix:optimizer', {
    mode: 'compress',
    quality: 70,
    lossless: false,
    targetKb: 250,
    width: 1080,
    height: 1080,
    maintainAspect: true,
    resizeMode: 'fit',
    scalePercent: 100,
  });
  const set = (patch) => setPrefs((current) => ({ ...current, ...patch }));
  const [compareChoice, setCompareChoice] = useState(null);

  const batch = useImageBatch({
    source: 'Image Optimizer',
    operation: 'optimize',
    getSteps: () => {
      if (prefs.mode === 'compress') {
        return prefs.lossless ? [{ type: 'convert', format: 'png' }] : [{ type: 'compress', quality: prefs.quality }];
      }
      if (prefs.mode === 'target-size') return [{ type: 'target-size', bytes: Math.max(1, prefs.targetKb) * 1024 }];
      return [{
        type: 'resize',
        width: prefs.width,
        height: prefs.height,
        maintainAspect: prefs.maintainAspect,
        quality: prefs.quality,
        options: { mode: prefs.resizeMode, percentage: prefs.scalePercent },
      }];
    },
  });

  const firstDone = batch.rows.findIndex((row) => row.status === 'done' && row.blob?.type?.startsWith('image/'));
  const shownIndex = compareChoice !== null && batch.rows[compareChoice]?.status === 'done' ? compareChoice : firstDone;
  const shownRow = shownIndex >= 0 ? batch.rows[shownIndex] : null;

  const verb = prefs.mode === 'compress' ? 'Compress' : prefs.mode === 'target-size' ? 'Fit to target size' : 'Resize';

  return (
    <PageTransition>
      <PageHeader
        icon={Zap}
        accent="primary"
        title="Image Optimizer"
        description="Make images smaller without a visible difference: compress, hit an exact file size, or resize."
      />

      <FileWorkbench
        files={batch.files}
        rows={batch.rows}
        onFiles={batch.addFiles}
        onRemove={(index) => { setCompareChoice(null); batch.removeFile(index); }}
        onClear={() => { setCompareChoice(null); batch.clear(); }}
        onRetry={batch.retry}
        onCompare={setCompareChoice}
        compareIndex={shownIndex >= 0 ? shownIndex : null}
        noun="image"
        maxFiles={batch.maxFiles}
        accept={IMAGE_ACCEPT}
        formats={IMAGE_FORMAT_CHIPS}
        folder
        dropLabel="Drop images to optimize"
        dropSublabel="Shrink one image or a whole folder in a few seconds"
        summary={<ResultsBanner summary={batch.summary} onDownloadAll={batch.downloadAll} zipping={batch.zipping} zipProgress={batch.zipProgress} showSavings noun="image" />}
        asideTitle="Optimize"
        aside={
          <>
            <Segmented ariaLabel="Optimization method" fullWidth value={prefs.mode} onChange={(mode) => set({ mode })} options={MODES} />

            {prefs.mode === 'compress' && (
              <>
                <Segmented
                  ariaLabel="Compression strength"
                  fullWidth
                  size="sm"
                  value={QUALITY_PRESETS.some((preset) => preset.value === prefs.quality) ? prefs.quality : null}
                  onChange={(quality) => set({ quality, lossless: false })}
                  options={QUALITY_PRESETS.map((preset) => ({ value: preset.value, label: `${preset.label} · ${preset.value}%`, disabled: prefs.lossless }))}
                />
                <Slider label="Quality" value={prefs.quality} min={10} max={100} disabled={prefs.lossless} onChange={(quality) => set({ quality })} minLabel="Smaller file" maxLabel="Better quality" />
                <Toggle label="Lossless PNG" description="No quality loss. Files are usually larger than lossy." checked={prefs.lossless} onChange={(lossless) => set({ lossless })} />
              </>
            )}

            {prefs.mode === 'target-size' && (
              <>
                <NumberInput label="Target size (KB)" min={1} value={prefs.targetKb} onChange={(value) => set({ targetKb: value === '' ? 1 : value })} hint="Exports JPEG at the highest quality that fits, shrinking dimensions if it must." />
                <Segmented
                  ariaLabel="Common target sizes"
                  size="sm"
                  fullWidth
                  value={prefs.targetKb}
                  onChange={(targetKb) => set({ targetKb })}
                  options={[100, 250, 500, 1000].map((kb) => ({ value: kb, label: kb >= 1000 ? '1 MB' : `${kb} KB` }))}
                />
              </>
            )}

            {prefs.mode === 'resize' && (
              <>
                <Select
                  label="Preset"
                  value={resizePresets.find((preset) => preset.width === prefs.width && preset.height === prefs.height && preset.label !== 'Custom')?.label || 'Custom'}
                  onChange={(event) => {
                    const preset = resizePresets.find((item) => item.label === event.target.value);
                    if (preset && preset.label !== 'Custom') set({ width: preset.width, height: preset.height });
                  }}
                >
                  {resizePresets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}{preset.label !== 'Custom' ? ` · ${preset.width}×${preset.height}` : ''}</option>)}
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput label="Width (px)" min={1} value={prefs.width} onChange={(width) => set({ width: width === '' ? 1 : width })} />
                  <NumberInput label="Height (px)" min={1} value={prefs.height} disabled={prefs.maintainAspect} onChange={(height) => set({ height: height === '' ? 1 : height })} />
                </div>
                <Toggle label="Keep aspect ratio" description="Height follows width, so nothing is stretched." checked={prefs.maintainAspect} onChange={(maintainAspect) => set({ maintainAspect })} />
                <Disclosure title="Advanced">
                  <Select label="Resize mode" value={prefs.resizeMode} onChange={(event) => set({ resizeMode: event.target.value })}>
                    <option value="fit">Fit inside</option>
                    <option value="fill">Fill and crop</option>
                    <option value="stretch">Stretch</option>
                  </Select>
                  <NumberInput label="Scale (%)" min={1} max={1000} value={prefs.scalePercent} onChange={(scalePercent) => set({ scalePercent: scalePercent === '' ? 100 : scalePercent })} hint="Used instead of width and height when it is not 100." />
                  <Slider label="Output quality" value={prefs.quality} min={10} max={100} onChange={(quality) => set({ quality })} />
                </Disclosure>
              </>
            )}
          </>
        }
        run={{
          label: `${verb} ${pluralize(batch.files.length, 'image')}`,
          onClick: batch.run,
          progress: batch.progress,
          progressLabel: batch.currentName ? `Optimizing ${batch.currentName}` : 'Optimizing',
          onCancel: batch.cancel,
        }}
      >
        {shownRow && (
          <Panel title={`Before / after · ${shownRow.name}`} className="mt-5" bodyClassName="!pt-3">
            <CompareResult file={batch.files[shownIndex]} row={shownRow} />
          </Panel>
        )}
      </FileWorkbench>
    </PageTransition>
  );
}
