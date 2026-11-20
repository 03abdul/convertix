import { AlertCircle, Clock, Download, FolderDown, RotateCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import FileThumb from '@/components/ui/FileThumb';
import { useApp } from '@/context/AppContext';
import { MAX_STORED_BYTES, useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';
import { useConfirm } from '@/context/DialogContext';
import { formatBytes } from '@/utils/format';
import { createZip, downloadBlob } from '@/utils/zip';

function DownloadRow({ item, onRemove }) {
  // A File wrapper around the stored blob (no copy) lets the thumbnail logic work on it.
  const file = useMemo(() => new File([item.blob], item.name, { type: item.blob.type }), [item]);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-dark-900/40 p-2 pr-3 transition-colors hover:border-white/15">
      <FileThumb file={file} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dark-100" title={item.name}>{item.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-dark-400">
          <span>{item.source}</span>
          <span>{formatBytes(item.size)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{new Date(item.timestamp).toLocaleTimeString()}</span>
        </p>
      </div>
      <button type="button" aria-label={`Download ${item.name}`} onClick={() => downloadBlob(item.blob, item.name)} className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-300 transition-colors hover:bg-white/10 hover:text-secondary-300"><Download className="h-4 w-4" /></button>
      <button type="button" aria-label={`Remove ${item.name} from the list`} onClick={() => onRemove(item.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-error-500/15 hover:text-error-300"><Trash2 className="h-4 w-4" /></button>
    </li>
  );
}

export default function Downloads() {
  const { items, failedItems, removeItem, clearAll, removeFailedItem, addItem } = useDownloads();
  const { recentFiles, clearRecentFiles } = useApp();
  const { notify } = useFeedback();
  const confirm = useConfirm();
  const [zipping, setZipping] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);

  const retryItem = async (item) => {
    try {
      const result = await item.retry();
      if (!result?.blob) throw new Error('Retry did not produce an output file.');
      addItem({ name: result.name, blob: result.blob, size: result.blob.size, source: item.source });
      removeFailedItem(item.id);
    } catch (error) {
      notify(`${item.name}: ${getErrorMessage(error)}`, 'error');
    }
  };

  const retryAll = async () => {
    setRetrying(true);
    try {
      for (const item of failedItems) await retryItem(item);
    } finally {
      setRetrying(false);
    }
  };

  const downloadAll = async () => {
    setZipping(true);
    try {
      downloadBlob(await createZip(items.map((item) => ({ name: item.name, data: item.blob }))), `convertix-downloads-${Date.now()}.zip`);
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setZipping(false);
    }
  };

  const clearSession = async () => {
    const count = items.length;
    const ok = await confirm({
      title: 'Clear this session?',
      message: count > 0
        ? `${count} processed file${count === 1 ? '' : 's'} will be removed from memory and can't be recovered. Download anything you want to keep first.`
        : 'The failed-file list and recent files will be cleared.',
      confirmLabel: 'Clear session',
      tone: 'danger',
    });
    if (ok) { clearAll(); clearRecentFiles(); }
  };

  const hasAnything = items.length > 0 || failedItems.length > 0 || recentFiles.length > 0;

  return (
    <PageTransition>
      <PageHeader
        icon={FolderDown}
        title="Downloads"
        description={items.length ? `${items.length} file${items.length === 1 ? '' : 's'} from this session · ${formatBytes(totalBytes)} of ${formatBytes(MAX_STORED_BYTES)} kept in memory` : 'Everything you process in this session is collected here.'}
        actions={
          <>
            {items.length > 1 && <Button variant="secondary" size="sm" onClick={downloadAll} loading={zipping}><Download className="h-4 w-4" /> Download all (ZIP)</Button>}
            {hasAnything && <Button variant="ghost" size="sm" onClick={clearSession}><Trash2 className="h-4 w-4" /> Clear session</Button>}
          </>
        }
      />

      {failedItems.length > 0 && (
        <Panel
          title={`${failedItems.length} failed`}
          className="mb-5 !border-error-500/20"
          action={<Button variant="primary" size="sm" onClick={retryAll} loading={retrying}><RotateCw className="h-4 w-4" /> Retry all</Button>}
        >
          <ul className="space-y-2">
            {failedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-error-500/15 bg-error-500/5 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-error-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-dark-100">{item.name}</p>
                  <p className="text-xs text-error-300">{item.error}</p>
                  <p className="text-xs text-dark-500">{item.source}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => retryItem(item)} disabled={retrying}>Retry</Button>
                <button type="button" aria-label={`Dismiss ${item.name}`} onClick={() => removeFailedItem(item.id)} className="rounded-lg p-2 text-dark-400 hover:bg-error-500/15 hover:text-error-300"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {items.length === 0 && failedItems.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-white/10 px-6 py-16 text-center">
          <FolderDown className="mx-auto mb-4 h-12 w-12 text-dark-500" aria-hidden="true" />
          <p className="text-lg font-semibold text-dark-200">Nothing here yet</p>
          <p className="mt-1 text-sm text-dark-400">Process a file with any tool and it will appear here for quick access.</p>
        </div>
      ) : (
        items.length > 0 && (
          <Panel bodyClassName="!p-3">
            <ul className="space-y-1.5" aria-label="Processed files">
              {[...items].reverse().map((item) => <DownloadRow key={item.id} item={item} onRemove={removeItem} />)}
            </ul>
          </Panel>
        )
      )}
    </PageTransition>
  );
}
