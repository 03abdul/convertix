import { Crop, FileImage, Gauge, ImageDown, Minimize2, RotateCw, Scaling, ShieldOff, Zap } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import ChoiceGrid from '@/components/ui/ChoiceGrid';
import Segmented from '@/components/ui/Segmented';
import { NumberInput } from '@/components/ui/Controls';
import { useImageBatch } from '@/hooks/useImageBatch';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useSupportedFormats } from '@/hooks/useSupportedFormats';
import { getFormatFromExtension } from '@/services/imageService';
import { IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { pluralize } from '@/utils/format';

const TOOLS = [
  { value: 'compress80', label: 'Compress to 80%', description: 'Smaller file, same look', icon: Minimize2 },
  { value: 'webp', label: 'Convert to WebP', description: 'Modern, compact format', icon: ImageDown },
  { value: 'resize1080', label: 'Resize to 1080p', description: 'Fit within 1920 × 1080', icon: Scaling },
  { value: 'square', label: 'Make square', description: 'Centered 1:1 crop', icon: Crop },
  { value: 'thumbnail', label: 'Thumbnail', description: '320 px on the long side', icon: FileImage },
  { value: 'targetSize', label: 'Exact file size', description: 'Fit under a size limit', icon: Gauge },
  { value: 'metadata', label: 'Remove metadata', description: 'Strip EXIF and location', icon: ShieldOff },
  { value: 'autoRotate', label: 'Fix orientation', description: 'Apply the EXIF rotation', icon: RotateCw },
];

const SAME_FORMAT = { jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp', bmp: 'bmp' };

function stepsFor(tool, file, targetKb) {
  switch (tool) {
    case 'autoRotate': return [{ type: 'rotate', degrees: 0, flipH: false, flipV: false }];
    case 'webp': return [{ type: 'convert', format: 'webp', quality: 85 }];
    case 'compress80': return [{ type: 'compress', quality: 80 }];
    case 'resize1080': return [{ type: 'resize', width: 1920, height: 1080, maintainAspect: true, quality: 90 }];
    case 'square': return [{ type: 'crop', preset: 'square' }];
    case 'metadata': return [{ type: 'convert', format: SAME_FORMAT[getFormatFromExtension(file.name)] || 'png', quality: 92 }];
    case 'thumbnail': return [{ type: 'resize', width: 320, height: 320, maintainAspect: true, quality: 85, options: { mode: 'fit', exactCanvas: true, backgroundColor: '#ffffff' } }];
    default: return [{ type: 'target-size', bytes: Math.max(1, targetKb) * 1024 }];
  }
}

export default function QuickTools() {
  const supportedFormats = useSupportedFormats();
  const [prefs, setPrefs] = usePersistentState('convertix:quick', { tool: 'compress80', targetKb: 250 });
  // Hide actions this browser cannot perform (WebP export is not available everywhere).
  const tools = TOOLS.filter((tool) => tool.value !== 'webp' || supportedFormats.includes('webp'));
  const active = tools.find((tool) => tool.value === prefs.tool) || tools[0];

  const batch = useImageBatch({
    source: 'Quick Tools',
    operation: active.value,
    getSteps: (file) => stepsFor(active.value, file, prefs.targetKb),
  });

  return (
    <PageTransition>
      <PageHeader
        icon={Zap}
        accent="primary"
        title="Quick Tools"
        description="One-click fixes for the things you do all the time. Pick an action, drop your images."
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
        toolbar={
          <ChoiceGrid
            ariaLabel="Quick action"
            columns="grid-cols-2 sm:grid-cols-4"
            value={active.value}
            onChange={(tool) => setPrefs((current) => ({ ...current, tool }))}
            options={tools}
          />
        }
        dropLabel={`${active.label}: drop your images`}
        dropSublabel={active.description}
        summary={<ResultsBanner summary={batch.summary} onDownloadAll={batch.downloadAll} zipping={batch.zipping} zipProgress={batch.zipProgress} showSavings noun="image" />}
        asideTitle={active.label}
        aside={
          active.value === 'targetSize' ? (
            <>
              <NumberInput label="Maximum size (KB)" min={1} value={prefs.targetKb} onChange={(value) => setPrefs((current) => ({ ...current, targetKb: value === '' ? 1 : value }))} hint="Exports JPEG at the best quality that fits." />
              <Segmented ariaLabel="Common sizes" size="sm" fullWidth value={prefs.targetKb} onChange={(targetKb) => setPrefs((current) => ({ ...current, targetKb }))} options={[100, 250, 500, 1000].map((kb) => ({ value: kb, label: kb >= 1000 ? '1 MB' : `${kb} KB` }))} />
            </>
          ) : (
            <p className="text-sm text-dark-300">{active.description}. No settings to adjust. Just run it.</p>
          )
        }
        run={{
          label: `${active.label}: ${pluralize(batch.files.length, 'image')}`,
          onClick: batch.run,
          progress: batch.progress,
          progressLabel: batch.currentName ? `Working on ${batch.currentName}` : 'Working',
          onCancel: batch.cancel,
        }}
      />
    </PageTransition>
  );
}
