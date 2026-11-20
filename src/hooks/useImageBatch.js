import { useCallback, useMemo, useRef, useState } from 'react';
import { isSupportedImageFile } from '@/services/imageService';
import { processImage, processImages } from '@/services/imageProcessor';
import { createZip, downloadBlob } from '@/utils/zip';
import { applyOutputNames } from '@/utils/outputNames';
import { summarizeResults } from '@/utils/stats';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';

/** Combines files + raw outcomes into display rows, applying the output filename pattern to finished ones. */
export function buildRows(files, outcomes, pattern, operation) {
  const rows = files.map((file, index) => {
    const outcome = outcomes[index];
    if (!outcome) return { status: 'idle' };
    if (outcome.status === 'done') return { ...outcome, originalSize: file.size, newSize: outcome.blob.size };
    if (outcome.status === 'error') return { status: 'error', error: outcome.error, originalSize: file.size, newSize: 0 };
    return { status: outcome.status };
  });
  if (!pattern) return rows;

  const finished = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.status === 'done');
  const named = applyOutputNames(
    finished.map(({ row, index }) => ({ ...row, file: files[index], outputIndex: index })),
    pattern,
    operation
  );
  named.forEach((result, position) => {
    rows[finished[position].index] = { ...rows[finished[position].index], name: result.name };
  });
  return rows;
}

/**
 * Everything an image-batch tool needs: the file list, running it on the worker pool with progress and
 * cancel, per-file retry, ZIP download, and hand-off to the session Downloads list.
 *
 * options:
 *   source     label shown in Downloads ("Image Converter")
 *   getSteps   (file) => pipeline steps for that file
 *   getContext () => extra context for the pipeline (e.g. { preserveMetadata })
 *   pattern    optional output filename pattern ({name}, {index}, {operation}, {ext})
 *   operation  value for the {operation} token
 *   maxFiles   queue limit (default 100)
 */
export function useImageBatch({ source, getSteps, getContext, pattern, operation = 'process', maxFiles = 100 }) {
  const { addItems, addFailedItems } = useDownloads();
  const { notify } = useFeedback();
  const [files, setFiles] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [currentName, setCurrentName] = useState('');
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const abortRef = useRef(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const latest = useRef({});
  latest.current = { getSteps, getContext, pattern, operation };

  const rows = useMemo(() => buildRows(files, outcomes, pattern, operation), [files, outcomes, pattern, operation]);
  const summary = useMemo(() => summarizeResults(rows), [rows]);
  const processing = progress !== null;

  const addFiles = useCallback((incoming) => {
    const supported = incoming.filter(isSupportedImageFile);
    if (supported.length !== incoming.length) notify('Some files were skipped because they are not supported images.', 'warning', { title: 'Files skipped' });
    const current = filesRef.current;
    const room = Math.max(0, maxFiles - current.length);
    if (supported.length > room) notify(`You can queue up to ${maxFiles} images at a time.`, 'warning', { title: 'Queue is full' });
    if (room > 0 && supported.length > 0) setFiles([...current, ...supported.slice(0, room)]);
  }, [maxFiles, notify]);

  const removeFile = useCallback((index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setOutcomes((current) => current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setFiles([]);
    setOutcomes([]);
  }, []);

  const run = useCallback(async () => {
    const queue = filesRef.current;
    if (queue.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setOutcomes([]);
    setProgress(0);
    const { getSteps: stepsFor, getContext: contextFor } = latest.current;
    const context = contextFor ? contextFor() : {};
    try {
      const final = await processImages(queue, (file) => stepsFor(file), context, {
        signal: controller.signal,
        onStart: (index, file) => {
          setCurrentName(file.name);
          setOutcomes((current) => { const next = [...current]; next[index] = { status: 'processing' }; return next; });
        },
        onProgress: (done, total, name, index, result) => {
          setProgress((done / total) * 100);
          setOutcomes((current) => { const next = [...current]; next[index] = result; return next; });
        },
      });
      const settled = final.map((outcome) => (outcome?.status === 'cancelled' ? undefined : outcome));
      setOutcomes(settled);

      const finished = buildRows(queue, settled, latest.current.pattern, latest.current.operation);
      const done = finished
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.status === 'done');
      if (done.length > 0) {
        addItems(done.map(({ row }) => ({ name: row.name, blob: row.blob, size: row.blob.size, source })));
      }
      const failed = finished.map((row, index) => ({ row, index })).filter(({ row }) => row.status === 'error');
      if (failed.length > 0) {
        addFailedItems(failed.map(({ row, index }) => ({
          name: queue[index].name,
          error: row.error,
          source,
          retry: () => processImage(queue[index], stepsFor(queue[index]), context),
        })));
        notify(`${failed.length} file${failed.length === 1 ? '' : 's'} failed. Use retry on the file to try again.`, 'warning', { title: 'Some files failed' });
      }
      if (controller.signal.aborted) {
        const processed = settled.filter(Boolean).length;
        notify(`${processed} of ${queue.length} file${queue.length === 1 ? ' was' : 's were'} processed before you stopped. Finished files are kept.`, 'info', { title: 'Stopped' });
      }
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      abortRef.current = null;
      setCurrentName('');
      setProgress(null);
    }
  }, [addFailedItems, addItems, notify, source]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(async (index) => {
    const file = filesRef.current[index];
    if (!file) return;
    const { getSteps: stepsFor, getContext: contextFor } = latest.current;
    setOutcomes((current) => { const next = [...current]; next[index] = { status: 'processing' }; return next; });
    try {
      const result = await processImage(file, stepsFor(file), contextFor ? contextFor() : {});
      setOutcomes((current) => { const next = [...current]; next[index] = { ...result, status: 'done' }; return next; });
      addItems([{ name: result.name, blob: result.blob, size: result.blob.size, source }]);
    } catch (error) {
      setOutcomes((current) => { const next = [...current]; next[index] = { status: 'error', error: getErrorMessage(error) }; return next; });
      notify(getErrorMessage(error));
    }
  }, [addItems, notify, source]);

  const downloadAll = useCallback(async () => {
    const done = rows.filter((row) => row.status === 'done' && row.blob);
    if (done.length === 0) return;
    if (done.length === 1) { downloadBlob(done[0].blob, done[0].name); return; }
    setZipping(true);
    setZipProgress(0);
    try {
      const zip = await createZip(done.map((row) => ({ name: row.name, data: row.blob })), setZipProgress);
      downloadBlob(zip, `convertix-${source.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.zip`);
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setZipping(false);
    }
  }, [notify, rows, source]);

  return {
    files, rows, summary, processing, progress, currentName, maxFiles,
    addFiles, removeFile, clear, run, cancel, retry, downloadAll, zipping, zipProgress,
  };
}
