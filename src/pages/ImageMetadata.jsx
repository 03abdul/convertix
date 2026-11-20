import { Check, Copy, FileImage, MapPin, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import Button from '@/components/Button';
import Dropzone from '@/components/Dropzone';
import PageHeader from '@/components/ui/PageHeader';
import { InfoSkeleton } from '@/components/ui/Skeleton';
import Panel, { SectionLabel } from '@/components/ui/Panel';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { getImageMetadata, removeImageMetadata } from '@/services/imageService';
import { formatBytes } from '@/utils/format';
import { summarizeExif } from '@/utils/exif';
import { IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { downloadBlob } from '@/utils/zip';

function DetailGrid({ items }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/5 bg-dark-900/50 px-3.5 py-2.5">
          <dt className="text-xs text-dark-400">{label}</dt>
          <dd className="mt-0.5 break-all text-sm font-semibold text-dark-100">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ImageMetadata() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewUrl = useObjectUrl(file);
  const { addItem } = useDownloads();
  const { notify } = useFeedback();

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const inspect = async (files) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setMetadata(null);
    setPreviewFailed(false);
    setLoading(true);
    try {
      setMetadata(await getImageMetadata(selected));
    } catch (error) {
      setFile(null);
      notify(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const exif = useMemo(() => summarizeExif(metadata?.exif), [metadata]);
  const isJpeg = metadata && ['jpg', 'jpeg'].includes(metadata.format);

  const fileDetails = metadata && [
    ['Format', metadata.format.toUpperCase()],
    ['Dimensions', `${metadata.width} × ${metadata.height} px`],
    ['File size', formatBytes(metadata.fileSize)],
    ['Aspect ratio', `${metadata.aspectRatio.toFixed(3)} : 1`],
    ['Resolution', metadata.dpi ? `${metadata.dpi} DPI` : 'Not stored'],
    ['Color space', metadata.colorSpace ?? 'Not stored'],
  ];

  const stripMetadata = async () => {
    setCleaning(true);
    try {
      const result = await removeImageMetadata(file);
      addItem({ name: result.name, blob: result.blob, size: result.blob.size, source: 'Metadata Cleaner' });
      downloadBlob(result.blob, result.name);
      notify('Embedded metadata was not copied into the new file.', 'success', { title: 'Clean copy downloaded' });
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setCleaning(false);
    }
  };

  const copyDetails = async () => {
    const lines = [...fileDetails, ...exif.fields].map(([label, value]) => `${label}: ${value}`);
    try {
      await navigator.clipboard.writeText([`File: ${metadata.name}`, ...lines].join('\n'));
      setCopied(true);
    } catch {
      notify('Copying is not available in this browser.', 'warning', { title: 'Cannot copy' });
    }
  };

  return (
    <PageTransition>
      <PageHeader
        icon={FileImage}
        title="Image Information"
        description="See what an image reveals: size, camera details and even GPS location. Then share a clean copy."
      />

      {!file ? (
        <Dropzone onFiles={inspect} accept="image/*,.tif,.tiff,.heic,.heif" multiple={false} formats={IMAGE_FORMAT_CHIPS} label="Drop an image to inspect" sublabel="Nothing is uploaded. It is read right here in your browser." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Panel bodyClassName="!p-3">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-dark-900/70">
                {previewUrl && !previewFailed
                  ? <img src={previewUrl} alt={`Preview of ${file.name}`} onError={() => setPreviewFailed(true)} className="h-full w-full object-contain" />
                  : <FileImage className="h-10 w-10 text-dark-500" aria-hidden="true" />}
              </div>
              <p className="mt-3 truncate px-1 text-sm font-semibold text-dark-100" title={file.name}>{file.name}</p>
              <p className="px-1 text-xs text-dark-400">{formatBytes(file.size)}</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => { setFile(null); setMetadata(null); }}>Choose another image</Button>
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            {loading || !metadata ? (
              <InfoSkeleton />
            ) : (
              <>
                {exif.hasLocation ? (
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4">
                    <MapPin className="h-6 w-6 shrink-0 text-warning-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-warning-300">This image contains a GPS location</p>
                      <p className="text-xs text-dark-300">Anyone you send the original to could see where it was taken. Remove it before sharing.</p>
                    </div>
                    <Button variant="accent" size="sm" onClick={stripMetadata} loading={cleaning}><ShieldCheck className="h-4 w-4" /> Remove &amp; download</Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-dark-800/60 p-4">
                    {metadata.exif ? <ShieldAlert className="h-6 w-6 shrink-0 text-dark-300" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6 shrink-0 text-success-400" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-dark-50">{metadata.exif ? 'No GPS location found' : isJpeg ? 'No EXIF data found' : 'This format does not carry EXIF data we can read'}</p>
                      <p className="text-xs text-dark-400">{exif.hasCameraInfo ? 'Camera details are embedded, but no location.' : 'Nothing sensitive was detected.'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={stripMetadata} loading={cleaning}><ShieldCheck className="h-4 w-4" /> Download clean copy</Button>
                  </div>
                )}

                <Panel title="File" action={<Button variant="ghost" size="sm" onClick={copyDetails}>{copied ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy details'}</Button>}>
                  <DetailGrid items={fileDetails} />
                </Panel>

                {exif.fields.length > 0 && (
                  <Panel title="Camera &amp; capture">
                    <DetailGrid items={exif.fields} />
                  </Panel>
                )}

                {metadata.exif && (
                  <details className="rounded-2xl border border-white/10 bg-dark-800/40 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-dark-200">Raw EXIF data</summary>
                    <SectionLabel className="mt-3">JSON</SectionLabel>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs text-dark-400">{JSON.stringify(metadata.exif, null, 2)}</pre>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
