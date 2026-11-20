import { FolderOpen, UploadCloud } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFolderImport } from '@/hooks/useFolderImport';
import { collectDroppedFiles } from '@/utils/droppedFiles';

// Several dropzones can be mounted at once; only the most recently mounted one reacts to Ctrl+V.
const pasteHandlers = [];
let pasteListening = false;

function onGlobalPaste(event) {
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))) return;
  const handler = pasteHandlers[pasteHandlers.length - 1];
  const files = Array.from(event.clipboardData?.files || []);
  if (!handler || files.length === 0) return;
  event.preventDefault();
  handler(files);
}

function registerPasteHandler(handler) {
  pasteHandlers.push(handler);
  if (!pasteListening) {
    document.addEventListener('paste', onGlobalPaste);
    pasteListening = true;
  }
  return () => {
    const index = pasteHandlers.lastIndexOf(handler);
    if (index >= 0) pasteHandlers.splice(index, 1);
    if (pasteHandlers.length === 0) {
      document.removeEventListener('paste', onGlobalPaste);
      pasteListening = false;
    }
  };
}

/**
 * Drop area. `folder` adds a "Choose folder" picker and accepts dropped folders; both open a review popup.
 * Note: the browser itself asks "upload all files from this folder?" when the folder *picker* is used, and a
 * page cannot remove that prompt. Dropping a folder (or picking files) never shows it.
 */
export default function Dropzone({
  onFiles,
  accept = 'image/*',
  multiple = true,
  folder = false,
  label = 'Drop files here',
  sublabel = '',
  formats = [],
  className = '',
  compact = false,
  paste = true,
  maxFiles,
  noun = 'file',
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList).filter((f) => f.type || f.size > 0);
      if (files.length > 0) {
        setError('');
        onFiles(files);
      }
      if (files.length !== fileList.length) setError('Some empty files were skipped.');
    },
    [onFiles]
  );

  // Dropped folders go through a review popup showing what will (and will not) be added.
  const folderImport = useFolderImport({ accept, maxFiles, noun, onFiles: handleFiles });

  // Paste a screenshot or copied file straight from the clipboard.
  const pasteRef = useRef(null);
  pasteRef.current = (files) => handleFiles(multiple ? files : files.slice(0, 1));
  useEffect(() => {
    if (!paste) return undefined;
    return registerPasteHandler((files) => pasteRef.current?.(files));
  }, [paste]);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragging(false);
      if (!folder) {
        handleFiles(event.dataTransfer.files);
        return;
      }
      const { files, hadDirectory } = await collectDroppedFiles(event.dataTransfer);
      if (hadDirectory) folderImport.begin(files);
      else handleFiles(files);
    },
    [folder, handleFiles, folderImport]
  );

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border-2 border-dashed text-center transition-all duration-200 ${
        dragging
          ? 'border-secondary-400 bg-secondary-500/10'
          : 'border-white/15 bg-gradient-to-b from-white/[0.03] to-transparent hover:border-secondary-400/50'
      } ${compact ? 'p-6' : 'px-6 py-12 md:py-16'} ${className}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => { handleFiles(event.target.files); event.target.value = ''; }}
      />
      {folder && (
        <input
          ref={folderInputRef}
          type="file"
          accept={accept}
          multiple
          // @ts-expect-error non-standard but widely supported attribute
          webkitdirectory=""
          directory=""
          className="hidden"
          aria-label={`${label} (folder)`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => { folderImport.begin(event.target.files); event.target.value = ''; }}
        />
      )}

      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary-500/25 to-primary-500/25 transition-transform duration-200 ${dragging ? 'scale-110' : 'group-hover:scale-105'}`}>
          <UploadCloud className={`h-8 w-8 ${dragging ? 'text-secondary-300' : 'text-secondary-400'}`} aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-bold text-dark-50">{dragging ? 'Release to add your files' : label}</p>
          {sublabel && <p className="mt-1 text-sm text-dark-400">{sublabel}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}
            className="rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-400 px-5 py-2.5 text-sm font-semibold text-dark-950 shadow-lg shadow-secondary-500/20 transition-all hover:from-secondary-400 hover:to-secondary-300 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-300"
          >
            Browse {multiple ? 'files' : 'file'}
          </button>
          {folder && (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); folderImport.choose(() => folderInputRef.current?.click()); }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-dark-100 transition-all hover:bg-white/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" /> Choose folder
            </button>
          )}
        </div>
        {formats.length > 0 && (
          <ul className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Supported formats">
            {formats.map((format) => (
              <li key={format} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-dark-300">{format}</li>
            ))}
          </ul>
        )}
        {paste && <p className="text-xs text-dark-500">or drop {folder ? 'files or a whole folder' : multiple ? 'them' : 'it'} here · paste with Ctrl+V</p>}
        {folder && <p className="max-w-xs text-xs text-dark-500">Nothing is uploaded: your files stay on this device. Some browsers ask you to allow access to the folder you pick.</p>}
        {error && <p role="alert" className="text-sm text-error-400">{error}</p>}
      </div>
      {folderImport.dialog}
    </div>
  );
}
