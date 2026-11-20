import { AlertCircle, ArrowDown, ArrowUp, Check, Download, GitCompare, GripVertical, Loader2, RotateCw, X } from 'lucide-react';
import FileThumb from '@/components/ui/FileThumb';
import { useDragReorder } from '@/hooks/useDragReorder';
import { formatBytes } from '@/utils/format';
import { formatChange } from '@/utils/stats';
import { getExtension } from '@/utils/format';
import { downloadBlob } from '@/utils/zip';

const iconButton = 'flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-white/10 hover:text-dark-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 disabled:opacity-30 disabled:hover:bg-transparent';

function SizeLine({ file, row }) {
  if (row?.status === 'error') return <span className="text-error-400">{row.error || 'Processing failed'}</span>;
  if (row?.status === 'processing') return <span className="text-primary-300">Processing…</span>;
  if (row?.status === 'done') {
    const before = row.originalSize ?? file.size;
    const after = row.newSize ?? row.blob?.size ?? 0;
    const change = formatChange(before, after);
    const from = getExtension(file.name).toUpperCase();
    const to = getExtension(row.name || '').toUpperCase();
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {row.targetReached === false && <span className="font-semibold text-warning-400">Target size not reachable</span>}
        {row.note ? <span>{row.note}</span> : (
          <>
            {from && to && from !== to && <span className="font-semibold text-dark-300">{from} → {to}</span>}
            <span>{formatBytes(before)} → <span className="font-medium text-secondary-300">{formatBytes(after)}</span></span>
            {change && <span className={`rounded px-1.5 py-px text-[11px] font-bold ${change.startsWith('-') ? 'bg-success-500/15 text-success-300' : 'bg-warning-500/15 text-warning-400'}`}>{change}</span>}
          </>
        )}
      </span>
    );
  }
  return <span>{formatBytes(file.size)}{row?.meta ? ` · ${row.meta}` : ''}</span>;
}

/**
 * The single list that carries a file from "queued" to "done".
 * rows[i] (optional) describes the state of files[i]:
 *   { status: 'idle'|'processing'|'done'|'error', name?, blob?, originalSize?, newSize?, error?, note? }
 */
export default function FileRows({
  files,
  rows = [],
  onRemove,
  onRetry,
  onCompare,
  compareIndex = null,
  onDownload,
  onMove,
  thumbnails = true,
  busy = false,
  maxHeight = 'max-h-[28rem]',
}) {
  const drag = useDragReorder((from, to) => onMove?.(from, to));

  return (
    <ul className={`space-y-1.5 overflow-y-auto scrollbar-thin pr-1 ${maxHeight}`} aria-label="Files">
      {files.map((file, index) => {
        const row = rows[index];
        const status = row?.status || 'idle';
        const done = status === 'done';
        const dragProps = onMove && !busy ? drag.getItemProps(index) : {};
        const displayName = done && row.name ? row.name : file.name;
        const canCompare = done && onCompare && row.blob?.type?.startsWith('image/');
        return (
          <li
            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
            {...dragProps}
            className={`flex items-center gap-3 rounded-xl border bg-dark-900/40 p-2 pr-2.5 transition-colors ${
              compareIndex === index ? 'border-secondary-500/40' : 'border-white/[0.07] hover:border-white/15'
            } ${onMove && !busy ? 'cursor-grab active:cursor-grabbing' : ''} ${onMove ? drag.itemClass(index) : ''}`}
          >
            {onMove && <GripVertical className="h-4 w-4 shrink-0 text-dark-500" aria-hidden="true" />}
            {onMove && <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-dark-500">{index + 1}</span>}
            {thumbnails && <FileThumb file={file} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-dark-100" title={displayName}>{displayName}</p>
              <p className="text-xs text-dark-400"><SizeLine file={file} row={row} /></p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {status === 'processing' && <Loader2 className="mr-1 h-4 w-4 animate-spin text-primary-400" aria-label="Processing" />}
              {done && <Check className="mr-1 h-4 w-4 text-success-400" aria-label="Done" />}
              {status === 'error' && <AlertCircle className="mr-1 h-4 w-4 text-error-400" aria-label="Failed" />}
              {canCompare && (
                <button type="button" className={`${iconButton} ${compareIndex === index ? 'bg-secondary-500/15 text-secondary-300' : ''}`} aria-label={`Compare ${displayName} before and after`} aria-pressed={compareIndex === index} title="Compare before / after" onClick={() => onCompare(index)}>
                  <GitCompare className="h-4 w-4" />
                </button>
              )}
              {done && (row.blob || onDownload) && (
                <button type="button" className={iconButton} aria-label={`Download ${displayName}`} title="Download" onClick={() => (onDownload ? onDownload(index) : downloadBlob(row.blob, row.name))}>
                  <Download className="h-4 w-4" />
                </button>
              )}
              {status === 'error' && onRetry && (
                <button type="button" className={iconButton} aria-label={`Retry ${file.name}`} title="Retry" onClick={() => onRetry(index)} disabled={busy}>
                  <RotateCw className="h-4 w-4" />
                </button>
              )}
              {onMove && (
                <>
                  <button type="button" className={iconButton} aria-label={`Move ${file.name} up`} disabled={busy || index === 0} onClick={() => onMove(index, index - 1)}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className={iconButton} aria-label={`Move ${file.name} down`} disabled={busy || index === files.length - 1} onClick={() => onMove(index, index + 1)}><ArrowDown className="h-4 w-4" /></button>
                </>
              )}
              {onRemove && (
                <button type="button" className={`${iconButton} hover:!bg-error-500/15 hover:!text-error-300`} aria-label={`Remove ${file.name}`} title="Remove" disabled={busy} onClick={() => onRemove(index)}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
