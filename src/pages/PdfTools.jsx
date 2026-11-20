import { Combine, FileOutput, FileText, GripVertical, LayoutGrid, Minimize2, RotateCw, Scissors, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import ChoiceGrid from '@/components/ui/ChoiceGrid';
import { TileGridSkeleton } from '@/components/ui/Skeleton';
import Segmented from '@/components/ui/Segmented';
import { Select, Slider, TextInput } from '@/components/ui/Controls';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';
import { useDragReorder } from '@/hooks/useDragReorder';
import { usePersistentState } from '@/hooks/usePersistentState';
import { compressPdf, extractPages, getPdfPageCount, mergePdfs, pdfToImages, reorderPages, rotatePdf, splitPdf } from '@/services/pdfService';
import { formatBytes, pluralize } from '@/utils/format';
import { parsePageSelection, parseRanges } from '@/utils/pageRanges';
import { moveItem } from '@/utils/reorder';
import { createZip, downloadBlob } from '@/utils/zip';

const TOOLS = [
  { value: 'merge', label: 'Merge', description: 'Combine PDFs into one', icon: Combine },
  { value: 'split', label: 'Split', description: 'Cut into several PDFs', icon: Scissors },
  { value: 'extract', label: 'Extract pages', description: 'Keep only some pages', icon: FileOutput },
  { value: 'organize', label: 'Organize', description: 'Reorder or remove pages', icon: LayoutGrid },
  { value: 'rotate', label: 'Rotate', description: 'Turn all or some pages', icon: RotateCw },
  { value: 'compress', label: 'Compress', description: 'Make the file smaller', icon: Minimize2 },
];

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
const isPdf = (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export default function PdfTools() {
  const { addItems } = useDownloads();
  const { notify } = useFeedback();
  const [prefs, setPrefs] = usePersistentState('convertix:pdf', {
    tool: 'merge',
    splitMode: 'ranges',
    rotateAngle: 90,
    compressMode: 'optimize',
    compressQuality: 70,
    compressScale: 1.5,
  });
  const set = (patch) => setPrefs((current) => ({ ...current, ...patch }));
  const tool = prefs.tool;
  const multiple = tool === 'merge';

  const [files, setFiles] = useState([]);
  const [counts, setCounts] = useState({});
  const [pageInput, setPageInput] = useState('');
  const [organizePages, setOrganizePages] = useState([]);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const pageDrag = useDragReorder((from, to) => setOrganizePages((pages) => moveItem(pages, from, to)));

  // Page counts power the hints and range validation.
  useEffect(() => {
    let active = true;
    files.filter((file) => counts[fileKey(file)] === undefined).forEach(async (file) => {
      try {
        const count = await getPdfPageCount(file);
        if (active) setCounts((current) => ({ ...current, [fileKey(file)]: count }));
      } catch {
        if (active) setCounts((current) => ({ ...current, [fileKey(file)]: null }));
      }
    });
    return () => { active = false; };
  }, [files, counts]);

  // Thumbnails for the organizer.
  useEffect(() => {
    if (tool !== 'organize' || !files[0]) {
      setOrganizePages([]);
      return undefined;
    }
    let active = true;
    let urls = [];
    (async () => {
      try {
        const rendered = await pdfToImages(files[0], 'png', undefined, { scale: 0.35 });
        if (!active) return;
        urls = rendered.map((page) => URL.createObjectURL(page.blob));
        setOrganizePages(urls.map((url, index) => ({ index, url })));
      } catch (error) {
        if (active) notify(getErrorMessage(error));
      }
    })();
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tool, files, notify]);

  const rows = useMemo(() => files.map((file) => {
    const count = counts[fileKey(file)];
    return { status: 'idle', meta: count ? pluralize(count, 'page') : undefined };
  }), [files, counts]);

  const total = counts[files[0] && fileKey(files[0])] || 0;

  const addFiles = useCallback((incoming) => {
    const pdfs = incoming.filter(isPdf);
    if (pdfs.length !== incoming.length) notify('Only PDF files can be used here.', 'warning', { title: 'PDFs only' });
    setResult(null);
    setFiles((current) => (multiple ? [...current, ...pdfs] : pdfs.slice(0, 1)));
  }, [multiple, notify]);

  const chooseTool = (next) => {
    set({ tool: next });
    setResult(null);
    setPageInput('');
    if (next !== 'merge') setFiles((current) => current.slice(0, 1));
  };

  const finish = (outputs, originalSize) => {
    setResult({ files: outputs, originalSize, newSize: outputs.reduce((sum, output) => sum + output.blob.size, 0) });
    addItems(outputs.map((output) => ({ name: output.name, blob: output.blob, size: output.blob.size, source: 'PDF Tools' })));
  };

  const baseName = files[0]?.name.replace(/\.pdf$/i, '') || 'document';

  const run = async () => {
    if (files.length === 0) return;
    setResult(null);
    setProgress(5);
    try {
      if (tool === 'merge') {
        if (files.length < 2) throw new Error('Add at least two PDFs to merge.');
        const blob = await mergePdfs(files, (done, count) => setProgress((done / count) * 100));
        finish([{ name: 'merged.pdf', blob }], files.reduce((sum, file) => sum + file.size, 0));
      } else if (tool === 'split') {
        const count = total || (await getPdfPageCount(files[0]));
        const ranges = prefs.splitMode === 'every'
          ? Array.from({ length: count }, (_, index) => ({ start: index + 1, end: index + 1 }))
          : parseRanges(pageInput, count);
        const parts = await splitPdf(files[0], ranges);
        finish(parts.map((part) => ({ name: `${baseName}-${part.name}`, blob: part.blob })), files[0].size);
      } else if (tool === 'extract') {
        const indices = parsePageSelection(pageInput, total || (await getPdfPageCount(files[0])));
        if (!pageInput.trim()) throw new Error('Enter the pages to keep, for example 1-3, 5.');
        finish([{ name: `${baseName}-extracted.pdf`, blob: await extractPages(files[0], indices) }], files[0].size);
      } else if (tool === 'rotate') {
        const indices = pageInput.trim() ? parsePageSelection(pageInput, total || (await getPdfPageCount(files[0]))) : undefined;
        finish([{ name: `${baseName}-rotated.pdf`, blob: await rotatePdf(files[0], prefs.rotateAngle, indices) }], files[0].size);
      } else if (tool === 'compress') {
        const blob = await compressPdf(files[0], { mode: prefs.compressMode, quality: prefs.compressQuality / 100, scale: prefs.compressScale }, (done, count) => setProgress((done / count) * 100));
        finish([{ name: `${baseName}-compressed.pdf`, blob }], files[0].size);
      } else if (tool === 'organize') {
        if (organizePages.length === 0) throw new Error('Wait for the page previews to load first.');
        finish([{ name: `${baseName}-organized.pdf`, blob: await reorderPages(files[0], organizePages.map((page) => page.index)) }], files[0].size);
      }
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setProgress(null);
    }
  };

  const downloadResult = async () => {
    if (!result) return;
    if (result.files.length === 1) { downloadBlob(result.files[0].blob, result.files[0].name); return; }
    downloadBlob(await createZip(result.files.map((output) => ({ name: output.name, data: output.blob }))), `${baseName}-pages.zip`);
  };

  const active = TOOLS.find((item) => item.value === tool);
  const grewInstead = result && tool === 'compress' && result.newSize >= result.originalSize;
  const pageHint = total ? `This PDF has ${pluralize(total, 'page')}.` : undefined;

  const aside = (() => {
    switch (tool) {
      case 'merge':
        return <p className="text-sm text-dark-300">PDFs are merged in the order shown. Drag the rows to reorder them.{files.length < 2 && <span className="mt-1 block text-warning-400">Add at least one more PDF.</span>}</p>;
      case 'split':
        return (
          <>
            <Segmented ariaLabel="Split method" fullWidth value={prefs.splitMode} onChange={(splitMode) => set({ splitMode })} options={[{ value: 'ranges', label: 'By ranges' }, { value: 'every', label: 'Every page' }]} />
            {prefs.splitMode === 'ranges'
              ? <TextInput label="Page ranges" placeholder="1-3, 5, 7-9" value={pageInput} onChange={(event) => setPageInput(event.target.value)} hint={`Each part becomes its own PDF. ${pageHint || ''}`} />
              : <p className="text-sm text-dark-300">Creates one PDF per page{total ? ` (${pluralize(total, 'file')})` : ''}.</p>}
          </>
        );
      case 'extract':
        return <TextInput label="Pages to keep" placeholder="1-3, 5, 8" value={pageInput} onChange={(event) => setPageInput(event.target.value)} hint={`Combined into one new PDF. ${pageHint || ''}`} />;
      case 'rotate':
        return (
          <>
            <Segmented ariaLabel="Rotation" fullWidth value={prefs.rotateAngle} onChange={(rotateAngle) => set({ rotateAngle })} options={[{ value: 90, label: '90° right' }, { value: 180, label: '180°' }, { value: 270, label: '90° left' }]} />
            <TextInput label="Pages (optional)" placeholder="All pages" value={pageInput} onChange={(event) => setPageInput(event.target.value)} hint={`Leave empty to rotate every page. ${pageHint || ''}`} />
          </>
        );
      case 'compress':
        return (
          <>
            <Segmented ariaLabel="Compression method" fullWidth value={prefs.compressMode} onChange={(compressMode) => set({ compressMode })} options={[{ value: 'optimize', label: 'Lossless' }, { value: 'rasterize', label: 'Recompress pages' }]} />
            {prefs.compressMode === 'optimize' ? (
              <p className="text-sm text-dark-300">Strips metadata and repacks the file. Text stays selectable. Savings are small.</p>
            ) : (
              <>
                <p className="flex gap-2 rounded-lg bg-warning-500/10 p-2.5 text-xs text-warning-400"><TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />Pages become images, so text can no longer be selected or searched. Best for scans.</p>
                <Slider label="Image quality" value={prefs.compressQuality} min={20} max={95} onChange={(compressQuality) => set({ compressQuality })} minLabel="Smaller file" maxLabel="Sharper" />
                <Select label="Page resolution" value={prefs.compressScale} onChange={(event) => set({ compressScale: Number(event.target.value) })}>
                  <option value="1">Screen · 72 dpi (smallest)</option>
                  <option value="1.5">Balanced · 108 dpi</option>
                  <option value="2">Print · 144 dpi</option>
                </Select>
              </>
            )}
          </>
        );
      default:
        return <p className="text-sm text-dark-300">Drag page previews to reorder them, or remove pages you don&apos;t need. Then save.</p>;
    }
  })();

  const runLabel = {
    merge: `Merge ${pluralize(files.length, 'PDF')}`,
    split: prefs.splitMode === 'every' ? 'Split into single pages' : 'Split PDF',
    extract: 'Extract pages',
    rotate: 'Rotate pages',
    compress: 'Compress PDF',
    organize: 'Save new page order',
  }[tool];

  return (
    <PageTransition>
      <PageHeader icon={FileText} accent="primary" title="PDF Tools" description="Merge, split, reorder, rotate and compress PDFs without uploading them anywhere." />

      <FileWorkbench
        files={files}
        rows={rows}
        onFiles={addFiles}
        onRemove={(index) => { setResult(null); setFiles((current) => current.filter((_, i) => i !== index)); }}
        onClear={() => { setResult(null); setFiles([]); }}
        onMove={multiple ? (from, to) => { setResult(null); setFiles((current) => moveItem(current, from, to)); } : undefined}
        multiple={multiple}
        noun="PDF"
        accept="application/pdf,.pdf"
        formats={['PDF']}
        toolbar={<ChoiceGrid ariaLabel="PDF tool" columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" value={tool} onChange={chooseTool} options={TOOLS} />}
        dropLabel={multiple ? 'Drop two or more PDFs' : 'Drop a PDF'}
        dropSublabel={active.description}
        listTitle={multiple ? `${pluralize(files.length, 'PDF')} · merged in this order` : undefined}
        summary={result && (
          <>
            <ResultsBanner
              summary={{ done: result.files.length, failed: 0, originalSize: result.originalSize, newSize: result.newSize, saved: result.originalSize - result.newSize, percent: result.originalSize ? ((result.originalSize - result.newSize) / result.originalSize) * 100 : 0 }}
              onDownloadAll={downloadResult}
              showSavings={tool === 'compress'}
              noun="PDF"
            />
            {grewInstead && (
              <p className="-mt-1 mb-3 rounded-xl border border-warning-500/20 bg-warning-500/10 px-4 py-2.5 text-xs text-warning-400">
                This PDF couldn&apos;t be made smaller with these settings, so the original was kept.{prefs.compressMode === 'optimize' ? ' Try “Recompress pages” for scans and image-heavy files.' : ' Try a lower quality or resolution.'}
              </p>
            )}
          </>
        )}
        asideTitle={active.label}
        aside={aside}
        run={{
          label: runLabel,
          onClick: run,
          disabled: (tool === 'merge' && files.length < 2) || (tool === 'organize' && organizePages.length === 0),
          progress,
          progressLabel: 'Working on your PDF',
          hint: result ? `Result: ${formatBytes(result.newSize)}` : undefined,
        }}
      >
        {tool === 'organize' && files.length > 0 && (
          <Panel title="Pages" description="Drag to reorder. Use the buttons to move or remove." className="mt-5">
            {organizePages.length === 0 ? (
              <TileGridSkeleton count={total || 6} label="Rendering page previews" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {organizePages.map((page, index) => (
                  <div key={page.index} {...pageDrag.getItemProps(index)} className={`cursor-grab rounded-xl border border-white/10 bg-dark-900/50 p-2 transition-shadow active:cursor-grabbing ${pageDrag.itemClass(index)}`}>
                    <img src={page.url} alt={`PDF page ${page.index + 1}`} draggable={false} className="mb-2 max-h-40 w-full rounded object-contain" />
                    <p className="mb-2 flex items-center justify-center gap-1 text-xs text-dark-300"><GripVertical className="h-3 w-3 text-dark-500" aria-hidden="true" />Page {page.index + 1}</p>
                    <div className="flex justify-center gap-1">
                      <button type="button" aria-label={`Move page ${page.index + 1} up`} disabled={index === 0} onClick={() => setOrganizePages((pages) => moveItem(pages, index, index - 1))} className="rounded bg-white/5 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                      <button type="button" aria-label={`Move page ${page.index + 1} down`} disabled={index === organizePages.length - 1} onClick={() => setOrganizePages((pages) => moveItem(pages, index, index + 1))} className="rounded bg-white/5 px-2 py-1 text-xs disabled:opacity-30">↓</button>
                      <button type="button" aria-label={`Remove page ${page.index + 1}`} disabled={organizePages.length <= 1} onClick={() => setOrganizePages((pages) => pages.filter((_, i) => i !== index))} className="rounded bg-error-500/10 px-2 py-1 text-xs text-error-300 disabled:opacity-30">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </FileWorkbench>
    </PageTransition>
  );
}
