import { FileCog, FileText, FileType, Image as ImageIcon, ImageDown, Info } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import ChoiceGrid from '@/components/ui/ChoiceGrid';
import Segmented from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Controls';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';
import { usePersistentState } from '@/hooks/usePersistentState';
import { convertDocument } from '@/services/documentService';
import { pluralize } from '@/utils/format';
import { summarizeResults } from '@/utils/stats';
import { createZip, downloadBlob } from '@/utils/zip';

const CONVERSIONS = [
  { value: 'txt-pdf', from: 'txt', to: 'pdf', label: 'Text → PDF', description: 'Plain text to a clean PDF', icon: FileText, accept: '.txt,text/plain', chip: 'TXT' },
  { value: 'docx-pdf', from: 'docx', to: 'pdf', label: 'Word → PDF', description: 'Keeps headings, lists, tables, images', icon: FileType, accept: '.docx', chip: 'DOCX' },
  { value: 'pdf-png', from: 'pdf', to: 'png', label: 'PDF → PNG', description: 'One image per page', icon: ImageIcon, accept: 'application/pdf,.pdf', chip: 'PDF' },
  { value: 'pdf-jpg', from: 'pdf', to: 'jpg', label: 'PDF → JPG', description: 'Smaller images, one per page', icon: ImageDown, accept: 'application/pdf,.pdf', chip: 'PDF' },
];

const baseName = (name) => name.replace(/\.[^.]+$/, '');

export default function DocumentConverter() {
  const { addItems } = useDownloads();
  const { notify } = useFeedback();
  const [prefs, setPrefs] = usePersistentState('convertix:documents', { conversion: 'docx-pdf', scale: 2, quality: 85 });
  const conversion = CONVERSIONS.find((item) => item.value === prefs.conversion) || CONVERSIONS[1];
  const [files, setFiles] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [current, setCurrent] = useState('');
  const [zipping, setZipping] = useState(false);
  const abortRef = useRef(null);

  const matches = useCallback((file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ext === conversion.from;
  }, [conversion.from]);

  const addFiles = useCallback((incoming) => {
    const valid = incoming.filter(matches);
    if (valid.length !== incoming.length) notify(`Only ${conversion.chip} files can be converted with this option.`, 'warning', { title: 'Wrong file type' });
    setFiles((existing) => [...existing, ...valid]);
  }, [conversion.chip, matches, notify]);

  const chooseConversion = (value) => {
    setPrefs((existing) => ({ ...existing, conversion: value }));
    setFiles([]);
    setOutcomes([]);
  };

  const convertOne = useCallback(async (file, onProgress = () => {}) => {
    if (conversion.from === 'pdf') {
      const images = await convertDocument(file, conversion.to, onProgress, { scale: prefs.scale, quality: prefs.quality / 100 });
      const prefix = baseName(file.name);
      const outputs = images.map((image) => ({ name: `${prefix}_${image.name}`, blob: image.blob }));
      return { status: 'done', outputs, blob: outputs[0].blob, name: outputs.length === 1 ? outputs[0].name : `${prefix}-pages.zip`, note: pluralize(outputs.length, 'image'), size: outputs.reduce((sum, item) => sum + item.blob.size, 0) };
    }
    const blob = await convertDocument(file, conversion.to);
    const name = `${baseName(file.name)}.${conversion.to}`;
    return { status: 'done', outputs: [{ name, blob }], blob, name, size: blob.size };
  }, [conversion, prefs.quality, prefs.scale]);

  const run = async () => {
    if (files.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setOutcomes([]);
    setProgress(0);
    const results = [];
    try {
      for (let index = 0; index < files.length; index++) {
        if (controller.signal.aborted) break;
        setCurrent(files[index].name);
        setOutcomes((existing) => { const next = [...existing]; next[index] = { status: 'processing' }; return next; });
        try {
          results[index] = await convertOne(files[index], (done, total) => setProgress(((index + done / total) / files.length) * 100));
        } catch (error) {
          results[index] = { status: 'error', error: getErrorMessage(error) };
        }
        setOutcomes((existing) => { const next = [...existing]; next[index] = results[index]; return next; });
        setProgress(((index + 1) / files.length) * 100);
      }
      const done = results.filter((item) => item?.status === 'done');
      if (done.length) addItems(done.flatMap((item) => item.outputs.map((output) => ({ name: output.name, blob: output.blob, size: output.blob.size, source: 'Document Converter' }))));
      const failed = results.filter((item) => item?.status === 'error').length;
      if (failed) notify(`${failed} file${failed === 1 ? '' : 's'} failed. Use retry on the file to try again.`, 'warning', { title: 'Some files failed' });
    } finally {
      abortRef.current = null;
      setCurrent('');
      setProgress(null);
    }
  };

  const retry = async (index) => {
    setOutcomes((existing) => { const next = [...existing]; next[index] = { status: 'processing' }; return next; });
    let result;
    try {
      result = await convertOne(files[index]);
      addItems(result.outputs.map((output) => ({ name: output.name, blob: output.blob, size: output.blob.size, source: 'Document Converter' })));
    } catch (error) {
      result = { status: 'error', error: getErrorMessage(error) };
      notify(result.error);
    }
    setOutcomes((existing) => { const next = [...existing]; next[index] = result; return next; });
  };

  const rows = useMemo(() => files.map((file, index) => {
    const outcome = outcomes[index];
    if (!outcome) return { status: 'idle' };
    if (outcome.status !== 'done') return outcome;
    return { status: 'done', name: outcome.name, blob: outcome.blob, originalSize: file.size, newSize: outcome.size, note: outcome.note ? `${outcome.note} · ${(outcome.size / 1024).toFixed(0)} KB` : undefined };
  }), [files, outcomes]);

  const summary = useMemo(() => summarizeResults(rows), [rows]);

  const downloadOutputs = async (outputs, zipName) => {
    if (outputs.length === 1) { downloadBlob(outputs[0].blob, outputs[0].name); return; }
    setZipping(true);
    try {
      downloadBlob(await createZip(outputs.map((item) => ({ name: item.name, data: item.blob }))), zipName);
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setZipping(false);
    }
  };

  const downloadRow = (index) => downloadOutputs(outcomes[index].outputs, `${baseName(files[index].name)}-pages.zip`);
  const downloadAll = () => downloadOutputs(outcomes.filter((item) => item?.status === 'done').flatMap((item) => item.outputs), `convertix-documents-${Date.now()}.zip`);

  return (
    <PageTransition>
      <PageHeader icon={FileCog} accent="accent" title="Document Converter" description="Convert Word and text files to PDF, or turn PDF pages into images." />

      <FileWorkbench
        files={files}
        rows={rows}
        onFiles={addFiles}
        onRemove={(index) => { setFiles((existing) => existing.filter((_, i) => i !== index)); setOutcomes((existing) => existing.filter((_, i) => i !== index)); }}
        onClear={() => { setFiles([]); setOutcomes([]); }}
        onRetry={retry}
        onDownload={downloadRow}
        noun={conversion.chip === 'PDF' ? 'PDF' : 'document'}
        accept={conversion.accept}
        formats={[conversion.chip]}
        toolbar={<ChoiceGrid ariaLabel="Conversion" columns="grid-cols-2 lg:grid-cols-4" value={conversion.value} onChange={chooseConversion} options={CONVERSIONS} />}
        dropLabel={`Drop ${conversion.chip} files to convert`}
        dropSublabel={conversion.description}
        summary={<ResultsBanner summary={summary} onDownloadAll={downloadAll} zipping={zipping} noun="file" />}
        asideTitle={conversion.label}
        aside={
          conversion.from === 'pdf' ? (
            <>
              <div>
                <p className="mb-1.5 text-xs font-medium text-dark-400">Resolution</p>
                <Segmented ariaLabel="Render resolution" fullWidth value={prefs.scale} onChange={(scale) => setPrefs((existing) => ({ ...existing, scale }))} options={[{ value: 1, label: 'Standard' }, { value: 2, label: 'High' }, { value: 3, label: 'Very high' }]} />
              </div>
              {conversion.to === 'jpg' && <Slider label="JPEG quality" value={prefs.quality} min={10} max={100} onChange={(quality) => setPrefs((existing) => ({ ...existing, quality }))} />}
              <p className="text-xs text-dark-400">Multi-page PDFs produce one image per page, bundled into a ZIP.</p>
            </>
          ) : (
            <p className="flex gap-2 text-xs text-dark-300"><Info className="mt-px h-4 w-4 shrink-0 text-dark-400" aria-hidden="true" />
              {conversion.from === 'docx'
                ? 'Headings, bold/italic, lists, tables and PNG/JPEG images are kept. Page layout, columns, headers and custom fonts are not reproduced.'
                : 'Text is wrapped onto A4 pages in a standard font. Characters outside Latin-1 are shown as “?”.'}
            </p>
          )
        }
        run={{
          label: `Convert ${pluralize(files.length, 'file')} to ${conversion.to.toUpperCase()}`,
          onClick: run,
          progress,
          progressLabel: current ? `Converting ${current}` : 'Converting',
          onCancel: () => abortRef.current?.abort(),
        }}
      />
    </PageTransition>
  );
}
