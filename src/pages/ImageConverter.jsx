import { Image as ImageIcon } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import Segmented from '@/components/ui/Segmented';
import { Slider, Toggle } from '@/components/ui/Controls';
import { SectionLabel } from '@/components/ui/Panel';
import { useApp } from '@/context/AppContext';
import { useImageBatch } from '@/hooks/useImageBatch';
import { usePersistentState } from '@/hooks/usePersistentState';
import { pickSupportedFormat, useSupportedFormats } from '@/hooks/useSupportedFormats';
import { FORMAT_INFO, IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { pluralize } from '@/utils/format';

export default function ImageConverter() {
  const { settings, updateSettings } = useApp();
  const supportedFormats = useSupportedFormats();
  const [prefs, setPrefs] = usePersistentState('convertix:converter', {
    format: settings.defaultFormat,
    quality: settings.defaultQuality,
  });
  const format = pickSupportedFormat(prefs.format, supportedFormats);
  const lossy = format === 'jpg' || format === 'webp';

  const batch = useImageBatch({
    source: 'Image Converter',
    operation: 'convert',
    getSteps: () => [{ type: 'convert', format, quality: prefs.quality }],
    getContext: () => ({ preserveMetadata: settings.preserveMetadata }),
  });

  return (
    <PageTransition>
      <PageHeader
        icon={ImageIcon}
        title="Image Converter"
        description="Convert between PNG, JPG, WebP and BMP. Reads HEIC, TIFF, AVIF and more. Everything stays on your device."
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
        dropLabel="Drop images to convert"
        dropSublabel="One image, many images, or a whole folder"
        summary={<ResultsBanner summary={batch.summary} onDownloadAll={batch.downloadAll} zipping={batch.zipping} zipProgress={batch.zipProgress} showSavings noun="image" />}
        asideTitle="Convert to"
        aside={
          <>
            <div>
              <Segmented
                ariaLabel="Output format"
                fullWidth
                value={format}
                onChange={(value) => setPrefs((current) => ({ ...current, format: value }))}
                options={supportedFormats.map((value) => ({ value, label: FORMAT_INFO[value].label }))}
              />
              <p className="mt-2 text-xs text-dark-400">{FORMAT_INFO[format].hint}</p>
            </div>
            {lossy && (
              <Slider
                label="Quality"
                value={prefs.quality}
                min={10}
                max={100}
                onChange={(quality) => setPrefs((current) => ({ ...current, quality }))}
                minLabel="Smaller file"
                maxLabel="Better quality"
              />
            )}
            {format === 'jpg' && (
              <div>
                <SectionLabel>Metadata</SectionLabel>
                <Toggle
                  label="Keep EXIF data"
                  description="Camera info and date when converting JPG to JPG. Other formats never keep it."
                  checked={settings.preserveMetadata}
                  onChange={(preserveMetadata) => updateSettings({ preserveMetadata })}
                />
              </div>
            )}
          </>
        }
        run={{
          label: `Convert ${pluralize(batch.files.length, 'image')} to ${FORMAT_INFO[format].label}`,
          onClick: batch.run,
          progress: batch.progress,
          progressLabel: batch.currentName ? `Converting ${batch.currentName}` : 'Converting',
          onCancel: batch.cancel,
        }}
      />
    </PageTransition>
  );
}
