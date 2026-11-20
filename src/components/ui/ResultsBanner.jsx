import { CheckCircle2, Download, TriangleAlert } from 'lucide-react';
import Button from '@/components/Button';
import ProgressBar from '@/components/ProgressBar';
import { formatBytes } from '@/utils/format';

/**
 * One line that answers "did it work, and what did I get?" after a run.
 * summary: output of summarizeResults(). `showSavings` is for tools whose goal is a smaller file.
 */
export default function ResultsBanner({ summary, onDownloadAll, zipping = false, zipProgress = 0, showSavings = false, noun = 'file' }) {
  if (!summary || (summary.done === 0 && summary.failed === 0)) return null;
  const plural = (count) => `${count} ${noun}${count === 1 ? '' : 's'}`;

  return (
    <div className="mb-3 rounded-2xl border border-success-500/20 bg-gradient-to-r from-success-500/10 to-transparent p-4" role="status">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {summary.done > 0 ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success-400" aria-hidden="true" /> : <TriangleAlert className="h-5 w-5 shrink-0 text-warning-400" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="text-sm font-bold text-dark-50">
              {summary.done > 0 ? `${plural(summary.done)} ready` : 'Nothing could be processed'}
              {summary.failed > 0 && <span className="ml-2 font-semibold text-error-300">· {summary.failed} failed</span>}
            </p>
            {summary.done > 0 && (
              <p className="text-xs text-dark-300">
                {showSavings && summary.saved > 0
                  ? <>Saved <span className="font-bold text-success-300">{formatBytes(summary.saved)}</span> ({summary.percent.toFixed(summary.percent >= 10 ? 0 : 1)}% smaller) · {formatBytes(summary.originalSize)} → {formatBytes(summary.newSize)}</>
                  : <>Total size {formatBytes(summary.newSize)}</>}
              </p>
            )}
          </div>
        </div>
        {summary.done > 0 && onDownloadAll && (
          <Button variant="secondary" size="sm" onClick={onDownloadAll} loading={zipping} disabled={zipping}>
            <Download className="h-4 w-4" /> {summary.done === 1 ? 'Download' : 'Download all (ZIP)'}
          </Button>
        )}
      </div>
      {zipping && <ProgressBar className="mt-3" value={zipProgress} label="Creating ZIP" />}
    </div>
  );
}
