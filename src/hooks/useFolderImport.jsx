import { useCallback, useMemo, useState } from 'react';
import FolderImportDialog from '@/components/ui/FolderImportDialog';
import { analyzeFolder } from '@/utils/folderImport';
import { canUseDirectoryPicker, isPickerCancelled, pickFolderFiles } from '@/utils/folderPicker';

/**
 * Folder import flow: call `begin(files)` with everything found in a folder; the popup shows what
 * will be added, and `onFiles` receives only the confirmed, supported files.
 * Returns { begin, dialog } where `dialog` is the element to render once.
 */
export function useFolderImport({ accept, maxFiles, noun = 'file', onFiles }) {
  const [pending, setPending] = useState(null); // { files, includeSubfolders }

  const begin = useCallback((files) => {
    if (!files || files.length === 0) return;
    setPending({ files: Array.from(files), includeSubfolders: true });
  }, []);

  const analysis = useMemo(
    () => (pending ? analyzeFolder(pending.files, { accept, maxFiles, includeSubfolders: pending.includeSubfolders }) : null),
    [pending, accept, maxFiles]
  );
  // Subfolder facts come from the full folder, so the toggle stays visible after switching it off.
  const fullAnalysis = useMemo(
    () => (pending ? analyzeFolder(pending.files, { accept, maxFiles }) : null),
    [pending, accept, maxFiles]
  );

  const cancel = useCallback(() => setPending(null), []);
  const confirm = useCallback(() => {
    if (analysis?.toAdd.length) onFiles(analysis.toAdd);
    setPending(null);
  }, [analysis, onFiles]);

  /**
   * Opens the folder chooser. Chrome/Edge use showDirectoryPicker (no "Upload N files to this site?"
   * message); other browsers, or any failure, fall back to the legacy input via `legacyClick`.
   */
  const choose = useCallback(async (legacyClick) => {
    if (!canUseDirectoryPicker()) { legacyClick(); return; }
    try {
      begin(await pickFolderFiles());
    } catch (error) {
      if (!isPickerCancelled(error)) legacyClick();
    }
  }, [begin]);

  const dialog = (
    <FolderImportDialog
      state={pending && analysis ? {
        analysis,
        noun,
        includeSubfolders: pending.includeSubfolders,
        analysisHasSubfolders: fullAnalysis.hasSubfolders,
        subfolderFileCount: fullAnalysis.subfolderFileCount,
      } : null}
      onToggleSubfolders={(includeSubfolders) => setPending((current) => (current ? { ...current, includeSubfolders } : current))}
      onConfirm={confirm}
      onCancel={cancel}
    />
  );

  return { begin, choose, dialog };
}
