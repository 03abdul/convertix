import { FilePlus2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import Segmented from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Controls';
import { SectionLabel } from '@/components/ui/Panel';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';
import { usePersistentState } from '@/hooks/usePersistentState';
import { isSupportedImageFile } from '@/services/imageService';
import { imagesToPdf } from '@/services/pdfService';
import { IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { pluralize } from '@/utils/format';
import { moveItem } from '@/utils/reorder';
import { downloadBlob } from '@/utils/zip';

const MAX_IMAGES = 200;

export default function ImageToPdf() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [prefs, setPrefs] = usePersistentState('convertix:image-to-pdf', { pageSize: 'fit', orientation: 'auto', margin: 24 });
  const { addItem } = useDownloads();
  const { notify } = useFeedback();
  const set = (patch) => { setResult(null); setPrefs((current) => ({ ...current, ...patch })); };
  const fixedPage = prefs.pageSize !== 'fit';

  const addFiles = useCallback((incoming) => {
    const supported = incoming.filter(isSupportedImageFile);
    if (supported.length !== incoming.length) notify('Some files were skipped because they are not supported images.', 'warning', { title: 'Files skipped' });
    setResult(null);
    setFiles((current) => {
      const next = [...current, ...supported].slice(0, MAX_IMAGES);
      return next;
    });
  }, [notify]);

  const run = async () => {
    if (files.length === 0) return;
    setResult(null);
    setProgress(0);
    try {
      const blob = await imagesToPdf(
        files,
        (done, total) => setProgress((done / total) * 100),
        { pageSize: prefs.pageSize, orientation: prefs.orientation, margin: fixedPage ? prefs.margin : 0 }
      );
      const name = `images-${new Date().toISOString().slice(0, 10)}.pdf`;
      setResult({ blob, name, pages: files.length });
      addItem({ name, blob, size: blob.size, source: 'Image to PDF' });
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setProgress(null);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        icon={FilePlus2}
        accent="primary"
        title="Image to PDF"
        description="Turn images into one PDF. Each image becomes a page, in the order you arrange them."
      />

      <FileWorkbench
        files={files}
        onFiles={addFiles}
        onRemove={(index) => { setResult(null); setFiles((current) => current.filter((_, i) => i !== index)); }}
        onClear={() => { setResult(null); setFiles([]); }}
        onMove={(from, to) => { setResult(null); setFiles((current) => moveItem(current, from, to)); }}
        noun="image"
        maxFiles={MAX_IMAGES}
        accept={IMAGE_ACCEPT}
        formats={IMAGE_FORMAT_CHIPS}
        folder
        dropLabel="Drop images to combine into a PDF"
        dropSublabel="You can reorder them before creating the PDF"
        listTitle={`${pluralize(files.length, 'page')} · drag to reorder`}
        summary={result && (
          <ResultsBanner
            summary={{ done: 1, failed: 0, newSize: result.blob.size, originalSize: 0, saved: 0, percent: 0 }}
            onDownloadAll={() => downloadBlob(result.blob, result.name)}
            noun={`PDF (${pluralize(result.pages, 'page')})`}
          />
        )}
        asideTitle="PDF settings"
        aside={
          <>
            <div>
              <SectionLabel>Page size</SectionLabel>
              <Segmented ariaLabel="Page size" fullWidth value={prefs.pageSize} onChange={(pageSize) => set({ pageSize })} options={[{ value: 'fit', label: 'Fit image' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }]} />
              <p className="mt-2 text-xs text-dark-400">{fixedPage ? 'Images are scaled to fit the page and centered.' : 'Each page takes the exact size of its image.'}</p>
            </div>
            {fixedPage && (
              <>
                <div>
                  <SectionLabel>Orientation</SectionLabel>
                  <Segmented ariaLabel="Orientation" fullWidth size="sm" value={prefs.orientation} onChange={(orientation) => set({ orientation })} options={[{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />
                </div>
                <Slider label="Margin" value={prefs.margin} min={0} max={72} unit=" pt" onChange={(margin) => set({ margin })} />
              </>
            )}
          </>
        }
        run={{
          label: `Create PDF from ${pluralize(files.length, 'image')}`,
          onClick: run,
          progress,
          progressLabel: 'Building PDF',
        }}
      />
    </PageTransition>
  );
}
