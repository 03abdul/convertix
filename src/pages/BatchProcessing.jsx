import { Layers, Minimize2, Repeat, RotateCw, Scaling, Sparkles, Stamp } from 'lucide-react';
import { useEffect } from 'react';
import PageTransition from '@/components/PageTransition';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import Segmented from '@/components/ui/Segmented';
import ChoiceGrid from '@/components/ui/ChoiceGrid';
import Disclosure from '@/components/ui/Disclosure';
import { NumberInput, Select, Slider, TextInput, Toggle } from '@/components/ui/Controls';
import { useApp } from '@/context/AppContext';
import { useImageBatch } from '@/hooks/useImageBatch';
import { usePersistentState } from '@/hooks/usePersistentState';
import { pickSupportedFormat, useSupportedFormats } from '@/hooks/useSupportedFormats';
import { FORMAT_INFO, IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { pluralize } from '@/utils/format';

const OPERATIONS = [
  { value: 'convert', label: 'Convert', description: 'Change the format', icon: Repeat },
  { value: 'compress', label: 'Compress', description: 'Reduce file size', icon: Minimize2 },
  { value: 'resize', label: 'Resize', description: 'Change dimensions', icon: Scaling },
  { value: 'watermark', label: 'Watermark', description: 'Stamp some text', icon: Stamp },
  { value: 'rotate', label: 'Rotate & flip', description: 'Turn or mirror', icon: RotateCw },
  { value: 'filter', label: 'Filter', description: 'Grayscale, sepia…', icon: Sparkles },
];

const FILTERS = [
  ['grayscale', 'Grayscale'],
  ['sepia', 'Sepia'],
  ['negative', 'Negative'],
  ['vintage', 'Vintage'],
  ['blackAndWhite', 'Black & white'],
];

export default function BatchProcessing() {
  const { settings } = useApp();
  const supportedFormats = useSupportedFormats();
  const [prefs, setPrefs] = usePersistentState('convertix:batch', {
    operation: 'convert',
    format: settings.defaultFormat,
    quality: settings.defaultQuality,
    width: 1080,
    height: 1080,
    maintainAspect: true,
    text: 'Convertix',
    opacity: 60,
    rotation: 90,
    flipH: false,
    flipV: false,
    filter: 'grayscale',
    pattern: '{name}.{ext}',
  });
  const set = (patch) => setPrefs((current) => ({ ...current, ...patch }));
  const format = pickSupportedFormat(prefs.format, supportedFormats);

  useEffect(() => {
    if (format !== prefs.format) setPrefs((current) => ({ ...current, format }));
  }, [format, prefs.format, setPrefs]);

  const batch = useImageBatch({
    source: 'Batch Processing',
    operation: prefs.operation,
    pattern: prefs.pattern || '{name}.{ext}',
    getContext: () => ({ preserveMetadata: settings.preserveMetadata }),
    getSteps: () => {
      switch (prefs.operation) {
        case 'convert': return [{ type: 'convert', format, quality: prefs.quality }];
        case 'compress': return [{ type: 'compress', quality: prefs.quality }];
        case 'resize': return [{ type: 'resize', width: prefs.width, height: prefs.height, maintainAspect: prefs.maintainAspect, quality: prefs.quality }];
        case 'watermark': return [{ type: 'watermark', text: prefs.text, opacity: prefs.opacity }];
        case 'rotate': return [{ type: 'rotate', degrees: prefs.rotation, flipH: prefs.flipH, flipV: prefs.flipV }];
        default: return [{ type: 'filter', filter: prefs.filter }];
      }
    },
  });

  const operation = OPERATIONS.find((item) => item.value === prefs.operation);
  const lossyFormat = format === 'jpg' || format === 'webp';
  const showsQuality = prefs.operation === 'compress' || prefs.operation === 'resize' || (prefs.operation === 'convert' && lossyFormat);

  return (
    <PageTransition>
      <PageHeader
        icon={Layers}
        title="Batch Processing"
        description="Apply one operation to up to 100 images at once, then download everything as a ZIP."
      />

      <FileWorkbench
        files={batch.files}
        rows={batch.rows}
        onFiles={batch.addFiles}
        onRemove={batch.removeFile}
        onClear={batch.clear}
        onRetry={batch.retry}
        noun="image"
        maxFiles={batch.maxFiles}
        accept={IMAGE_ACCEPT}
        formats={IMAGE_FORMAT_CHIPS}
        folder
        dropLabel="Drop a folder or many images"
        dropSublabel="Up to 100 images, processed in parallel"
        summary={<ResultsBanner summary={batch.summary} onDownloadAll={batch.downloadAll} zipping={batch.zipping} zipProgress={batch.zipProgress} showSavings noun="image" />}
        asideTitle="What should happen?"
        aside={
          <>
            <ChoiceGrid ariaLabel="Operation" columns="grid-cols-2" compact value={prefs.operation} onChange={(value) => set({ operation: value })} options={OPERATIONS} />

            <div className="space-y-4">
              {prefs.operation === 'convert' && (
                <>
                  <Segmented ariaLabel="Output format" fullWidth value={format} onChange={(value) => set({ format: value })} options={supportedFormats.map((value) => ({ value, label: FORMAT_INFO[value].label }))} />
                </>
              )}
              {prefs.operation === 'resize' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Width (px)" min={1} value={prefs.width} onChange={(width) => set({ width: width === '' ? 1 : width })} />
                    <NumberInput label="Height (px)" min={1} value={prefs.height} disabled={prefs.maintainAspect} onChange={(height) => set({ height: height === '' ? 1 : height })} />
                  </div>
                  <Toggle label="Keep aspect ratio" checked={prefs.maintainAspect} onChange={(maintainAspect) => set({ maintainAspect })} />
                </>
              )}
              {prefs.operation === 'watermark' && (
                <>
                  <TextInput label="Watermark text" value={prefs.text} onChange={(event) => set({ text: event.target.value })} />
                  <Slider label="Opacity" value={prefs.opacity} onChange={(opacity) => set({ opacity })} />
                </>
              )}
              {prefs.operation === 'rotate' && (
                <>
                  <Segmented ariaLabel="Rotation" fullWidth value={prefs.rotation} onChange={(rotation) => set({ rotation })} options={[0, 90, 180, 270].map((degrees) => ({ value: degrees, label: `${degrees}°` }))} />
                  <Toggle label="Flip horizontally" checked={prefs.flipH} onChange={(flipH) => set({ flipH })} />
                  <Toggle label="Flip vertically" checked={prefs.flipV} onChange={(flipV) => set({ flipV })} />
                </>
              )}
              {prefs.operation === 'filter' && (
                <Select label="Filter" value={prefs.filter} onChange={(event) => set({ filter: event.target.value })}>
                  {FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              )}
              {showsQuality && <Slider label="Quality" value={prefs.quality} min={10} max={100} onChange={(quality) => set({ quality })} minLabel="Smaller file" maxLabel="Better quality" />}
            </div>

            <Disclosure title="Output filenames">
              <TextInput label="Pattern" value={prefs.pattern} onChange={(event) => set({ pattern: event.target.value })} hint="Tokens: {name}  {index}  {operation}  {ext}" />
              <p className="text-xs text-dark-400">Changing the pattern renames finished files instantly. Nothing is re-processed.</p>
            </Disclosure>
          </>
        }
        run={{
          label: `${operation.label}: ${pluralize(batch.files.length, 'image')}`,
          onClick: batch.run,
          progress: batch.progress,
          progressLabel: batch.currentName ? `Processing ${batch.currentName}` : 'Processing',
          onCancel: batch.cancel,
        }}
      />
    </PageTransition>
  );
}
