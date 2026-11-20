import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FolderOpen, Info, TriangleAlert } from 'lucide-react';
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import FileThumb from '@/components/ui/FileThumb';
import { Toggle } from '@/components/ui/Controls';
import { useModalFocus } from '@/hooks/useModalFocus';
import { formatBytes, pluralize } from '@/utils/format';

/**
 * Popup shown after a folder is chosen or dropped: what is inside, what will be added,
 * what is skipped and why. Nothing is added until the user confirms.
 *
 * state: { analysis, includeSubfolders, noun }  (null when closed)
 */
export default function FolderImportDialog({ state, onToggleSubfolders, onConfirm, onCancel }) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const analysis = state?.analysis;
  const count = analysis?.toAdd.length ?? 0;
  const noun = state?.noun || 'file';

  useModalFocus({ open: Boolean(state), onClose: onCancel, panelRef, initialFocusRef: count > 0 ? confirmRef : cancelRef });

  // Portal: render at <body> so the popup is not styled by, or clickable through, the drop area that opened it.
  return createPortal(
    <AnimatePresence>
      {state && (
        <motion.div
          key="folder-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-dark-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
          // React events bubble through portals to the opener: keep clicks from reaching the drop area.
          onClick={(event) => event.stopPropagation()}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-secondary-500/25 bg-secondary-500/15 text-secondary-300">
                <FolderOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-lg font-bold text-dark-50" title={analysis.folderName}>
                  {count > 0 ? `Add from “${analysis.folderName}”?` : `Nothing to add from “${analysis.folderName}”`}
                </h2>
                <p className="mt-0.5 text-sm text-dark-300">Found {pluralize(analysis.total, 'file')} in this folder.</p>
              </div>
            </div>

            {count > 0 && (
              <div className="mt-5 rounded-xl border border-white/10 bg-dark-800/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {analysis.toAdd.slice(0, 5).map((file, index) => (
                      <FileThumb key={`${file.name}-${index}`} file={file} size={36} className="ring-2 ring-dark-800" />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-dark-50">{pluralize(count, noun)} will be added</p>
                    <p className="text-xs text-dark-400">{formatBytes(analysis.totalBytes)} in total</p>
                  </div>
                </div>
              </div>
            )}

            {analysis.overLimit > 0 && (
              <p className="mt-3 flex gap-2 rounded-lg bg-warning-500/10 p-2.5 text-xs text-warning-400">
                <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                {pluralize(analysis.overLimit, noun)} more {analysis.overLimit === 1 ? 'was' : 'were'} found, but only the first {pluralize(count, noun)} can be added at once.
              </p>
            )}

            {analysis.skipped.length > 0 && (
              <div className="mt-3 flex gap-2 rounded-lg bg-white/5 p-2.5 text-xs text-dark-300">
                <Info className="mt-px h-4 w-4 shrink-0 text-dark-400" aria-hidden="true" />
                <p>
                  <span className="font-semibold text-dark-100">{pluralize(analysis.skipped.length, 'file')} skipped</span> (not supported here):{' '}
                  {analysis.skippedGroups.slice(0, 4).map(([label, n]) => `${label} ×${n}`).join(', ')}
                  {analysis.skippedGroups.length > 4 ? ', …' : ''}
                </p>
              </div>
            )}

            {state.analysisHasSubfolders && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <Toggle
                  label="Include subfolders"
                  description={`${pluralize(state.subfolderFileCount, 'file')} ${state.subfolderFileCount === 1 ? 'is' : 'are'} inside subfolders.`}
                  checked={state.includeSubfolders}
                  onChange={onToggleSubfolders}
                />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-dark-100 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400"
              >
                {count > 0 ? 'Cancel' : 'Close'}
              </button>
              {count > 0 && (
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={onConfirm}
                  className="rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-400 px-5 py-2.5 text-sm font-semibold text-dark-950 shadow-lg shadow-secondary-500/20 transition-all hover:from-secondary-400 hover:to-secondary-300 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-300"
                >
                  Add {pluralize(count, noun)}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
