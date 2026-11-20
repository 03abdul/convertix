import { FolderPlus, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import Button from '@/components/Button';
import Dropzone from '@/components/Dropzone';
import ProgressBar from '@/components/ProgressBar';
import FileRows from '@/components/ui/FileRows';
import Panel from '@/components/ui/Panel';
import { useFolderImport } from '@/hooks/useFolderImport';
import { collectDroppedFiles, dragHasFiles } from '@/utils/droppedFiles';

function AddButton({ accept, onFiles, onChoose, folder = false, children, icon: Icon = Plus, disabled }) {
  const inputRef = useRef(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        // @ts-expect-error non-standard attribute
        {...(folder ? { webkitdirectory: '', directory: '' } : {})}
        onChange={(event) => { onFiles(Array.from(event.target.files)); event.target.value = ''; }}
      />
      <Button variant="ghost" size="sm" onClick={() => (onChoose ? onChoose(() => inputRef.current?.click()) : inputRef.current?.click())} disabled={disabled} aria-label={children} title={children}>
        <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{children}</span>
      </Button>
    </>
  );
}

/**
 * The common shape of a file tool:
 *   1. nothing selected  -> a single, focused drop area
 *   2. files selected    -> file list on the left, settings + one primary action on the right
 *   3. after running     -> the same rows turn into results; a summary banner appears on top
 *
 * run: { label, onClick, disabled, loading, progress, progressLabel, onCancel, hint }
 */
export default function FileWorkbench({
  files,
  onFiles,
  onRemove,
  onClear,
  accept,
  formats,
  dropLabel = 'Drop your files here',
  dropSublabel,
  folder = false,
  multiple = true,
  toolbar,
  rows,
  summary,
  aside,
  asideTitle = 'Settings',
  run,
  onRetry,
  onCompare,
  compareIndex,
  onDownload,
  onMove,
  thumbnails = true,
  maxFiles,
  listTitle,
  noun = 'file',
  children,
}) {
  const busy = run?.progress != null;
  const hasFiles = files.length > 0;
  const [dropping, setDropping] = useState(false);
  const folderImport = useFolderImport({ accept, maxFiles, noun, onFiles });

  // Once files are in the list, dropping more files (or a whole folder) onto it still works.
  const canDrop = multiple && !busy;
  const onDragOver = (event) => {
    if (!canDrop || !dragHasFiles(event)) return;
    event.preventDefault();
    setDropping(true);
  };
  const onDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDropping(false);
  };
  const onDrop = async (event) => {
    if (!canDrop || !dragHasFiles(event)) return;
    event.preventDefault();
    setDropping(false);
    if (!folder) { onFiles(Array.from(event.dataTransfer.files)); return; }
    const { files: dropped, hadDirectory } = await collectDroppedFiles(event.dataTransfer);
    if (hadDirectory) folderImport.begin(dropped);
    else onFiles(dropped);
  };

  if (!hasFiles) {
    return (
      <div>
        {toolbar && <div className="mb-5">{toolbar}</div>}
        <Dropzone
          onFiles={onFiles}
          accept={accept}
          multiple={multiple}
          folder={folder}
          label={dropLabel}
          sublabel={dropSublabel}
          formats={formats}
          maxFiles={maxFiles}
          noun={noun}
        />
      </div>
    );
  }

  return (
    <div>
      {toolbar && <div className="mb-5">{toolbar}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative min-w-0" data-testid="file-drop-target" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          {dropping && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-secondary-400 bg-dark-950/80 backdrop-blur-[2px]" aria-hidden="true">
              <UploadCloud className="h-8 w-8 text-secondary-300" />
              <p className="text-sm font-bold text-secondary-200">Drop to add{folder ? ' files or a folder' : ' files'}</p>
            </div>
          )}
          {summary}
          <Panel
            title={listTitle || `${files.length} ${noun}${files.length === 1 ? '' : 's'}`}
            action={
              <div className="flex items-center gap-1.5">
                {multiple && <AddButton accept={accept} onFiles={onFiles} disabled={busy}>Add</AddButton>}
                {multiple && folder && <AddButton accept={accept} onFiles={folderImport.begin} onChoose={folderImport.choose} folder icon={FolderPlus} disabled={busy}>Folder</AddButton>}
                <Button variant="ghost" size="sm" onClick={onClear} disabled={busy} aria-label="Clear all files" title="Clear all files"><Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Clear</span></Button>
              </div>
            }
            bodyClassName="!p-3"
          >
            <FileRows
              files={files}
              rows={rows}
              onRemove={onRemove}
              onRetry={onRetry}
              onCompare={onCompare}
              compareIndex={compareIndex}
              onDownload={onDownload}
              onMove={onMove}
              thumbnails={thumbnails}
              busy={busy}
            />
          </Panel>
          {children}
          {folderImport.dialog}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start" aria-label={asideTitle}>
          <Panel title={asideTitle} bodyClassName="space-y-5">
            {aside}
            {run && (
              <div className="space-y-3 border-t border-white/10 pt-5">
                <Button size="lg" className="w-full" onClick={run.onClick} disabled={run.disabled || busy} loading={run.loading ?? busy}>
                  {run.label}
                </Button>
                {busy && (
                  <div className="space-y-2">
                    <ProgressBar value={run.progress} label={run.progressLabel || 'Working…'} />
                    {run.onCancel && (
                      <button type="button" onClick={run.onCancel} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-dark-300 transition-colors hover:bg-white/5 hover:text-dark-100">
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                )}
                {!busy && run.hint && <p className="text-center text-xs text-dark-500">{run.hint}</p>}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
