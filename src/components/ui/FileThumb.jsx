import { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';

const NOT_PREVIEWABLE = /\.(tiff?|heic|heif|ico)$/i;
const MAX_PREVIEW_BYTES = 25 * 1024 * 1024; // avoid decoding huge files just for a thumbnail

/**
 * Small preview of a file. Images get a real thumbnail, created lazily when the row scrolls into
 * view (so 100 queued photos don't all decode at once) and revoked when it unmounts.
 * Everything else (PDFs, DOCX, HEIC/TIFF the browser cannot show) gets an icon.
 */
export default function FileThumb({ file, size = 44, className = '' }) {
  const ref = useRef(null);
  const [url, setUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const previewable = Boolean(file?.type?.startsWith('image/')) && !NOT_PREVIEWABLE.test(file.name) && file.size <= MAX_PREVIEW_BYTES;

  useEffect(() => {
    if (!previewable || !ref.current) return undefined;
    let objectUrl = null;
    const make = () => { objectUrl = URL.createObjectURL(file); setLoaded(false); setUrl(objectUrl); };
    if (typeof IntersectionObserver === 'undefined') {
      make();
      return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        make();
        observer.disconnect();
      }
    }, { rootMargin: '120px' });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, previewable]);

  const Icon = file?.type === 'application/pdf' || /\.(pdf|docx?|txt)$/i.test(file?.name || '') ? FileText : ImageIcon;

  return (
    <span
      ref={ref}
      style={{ width: size, height: size }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dark-900/80 ring-1 ring-white/10 ${className}`}
    >
      {url ? (
        <>
          {!loaded && <span aria-hidden="true" className="skeleton absolute inset-0 rounded-none" />}
          <img src={url} alt="" decoding="async" draggable={false} onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`} onError={() => setUrl(null)} />
        </>
      ) : (
        <Icon className="h-4 w-4 text-dark-400" aria-hidden="true" />
      )}
    </span>
  );
}
