/** A single placeholder block. Size and shape come from className. */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** A few lines of placeholder text; the last line is shorter, like real text. */
export function SkeletonText({ lines = 2, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={`h-3 ${index === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Wrapper that announces a loading region to assistive tech. */
export function SkeletonRegion({ label = 'Loading', delayed = false, className = '', children }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={`${delayed ? 'skeleton-delayed' : ''} ${className}`}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function SkeletonPanel({ children, className = '' }) {
  return <div className={`rounded-2xl border border-white/10 bg-dark-800/60 p-5 ${className}`}>{children}</div>;
}

/** Placeholder shaped like a tool page: header, a file list and a settings panel. Shown while a page's code loads. */
export function PageSkeleton() {
  return (
    <SkeletonRegion label="Loading page" delayed>
      <div className="mb-6 flex items-start gap-3.5">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="w-full max-w-md space-y-2.5 pt-0.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-full" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <SkeletonPanel>
          <Skeleton className="mb-4 h-4 w-24" />
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 rounded-xl border border-white/[0.07] p-2">
                <Skeleton className="h-11 w-11 shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
              </div>
            ))}
          </div>
        </SkeletonPanel>
        <SkeletonPanel>
          <Skeleton className="mb-4 h-4 w-20" />
          <Skeleton className="mb-5 h-10 w-full rounded-xl" />
          <div className="mb-5 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-2 w-full" /></div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </SkeletonPanel>
      </div>
    </SkeletonRegion>
  );
}

/** Grid of page-shaped tiles, e.g. PDF thumbnails that are still rendering. */
export function TileGridSkeleton({ count = 6, label = 'Loading previews' }) {
  return (
    <SkeletonRegion label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: Math.min(count, 12) }, (_, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-dark-900/50 p-2">
          <Skeleton className="mb-2 h-40 w-full" />
          <Skeleton className="mx-auto mb-2 h-3 w-16" />
          <div className="flex justify-center gap-1"><Skeleton className="h-6 w-7" /><Skeleton className="h-6 w-7" /><Skeleton className="h-6 w-14" /></div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Placeholder for the Image Information page while a file is being read. */
export function InfoSkeleton() {
  return (
    <SkeletonRegion label="Reading image information" className="space-y-5">
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <SkeletonPanel>
        <Skeleton className="mb-4 h-4 w-16" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[54px] rounded-xl" />)}
        </div>
      </SkeletonPanel>
    </SkeletonRegion>
  );
}
