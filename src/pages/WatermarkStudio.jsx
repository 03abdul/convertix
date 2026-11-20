import { Image as ImageIcon, ShieldCheck, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import Button from '@/components/Button';
import Dropzone from '@/components/Dropzone';
import PageHeader from '@/components/ui/PageHeader';
import Panel, { SectionLabel } from '@/components/ui/Panel';
import Segmented from '@/components/ui/Segmented';
import ResultsBanner from '@/components/ui/ResultsBanner';
import { Select, Slider, TextInput } from '@/components/ui/Controls';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';
import { applyWatermark, drawWatermark, loadImage } from '@/services/imageService';
import { formatBytes } from '@/utils/format';
import { IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { downloadBlob } from '@/utils/zip';

const POSITIONS = [
  ['top-left', '↖', 'Top left'], ['top-center', '↑', 'Top center'], ['top-right', '↗', 'Top right'],
  ['center-left', '←', 'Middle left'], ['center', '●', 'Center'], ['center-right', '→', 'Middle right'],
  ['bottom-left', '↙', 'Bottom left'], ['bottom-center', '↓', 'Bottom center'], ['bottom-right', '↘', 'Bottom right'],
];

const DEFAULTS = {
  type: 'text',
  text: 'Convertix',
  color: '#ffffff',
  opacity: 60,
  position: 'bottom-right',
  rotation: 0,
  scale: 0.5,
  imageSize: 25, // % of the photo's width, for image watermarks
  fontFamily: 'Arial, sans-serif',
  imageSrc: null,
  quality: 92,
};

export default function WatermarkStudio() {
  const [file, setFile] = useState(null);
  const [wm, setWm] = useState(DEFAULTS);
  const [overlay, setOverlay] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const baseRef = useRef(null);
  const { addItem } = useDownloads();
  const { notify } = useFeedback();
  const update = (patch) => { setResult(null); setWm((current) => ({ ...current, ...patch })); };

  /** Options exactly as the export will receive them (image size is converted to a scale factor). */
  const exportOptions = useCallback(() => {
    if (wm.type !== 'image' || !overlay) return wm;
    const overlayWidth = overlay.naturalWidth || overlay.width;
    return { ...wm, scale: ((wm.imageSize / 100) * imageSize.width) / overlayWidth };
  }, [wm, overlay, imageSize.width]);

  const render = useCallback(() => {
    const base = baseRef.current;
    const canvas = canvasRef.current;
    if (!base || !canvas) return;
    canvas.width = base.naturalWidth ?? base.width;
    canvas.height = base.naturalHeight ?? base.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    try {
      drawWatermark(ctx, canvas.width, canvas.height, exportOptions(), overlay);
    } catch { /* ignore invalid intermediate values while the user is typing */ }
  }, [exportOptions, overlay]);

  const handleFiles = useCallback((files) => {
    const next = files[0];
    if (!next) return;
    setFile(next);
    setResult(null);
    setWm(DEFAULTS);
    setOverlay(null);
  }, []);

  useEffect(() => {
    if (!file) return undefined;
    let active = true;
    loadImage(file).then(({ img, width, height }) => {
      if (!active) return;
      baseRef.current = img;
      setImageSize({ width, height });
    }).catch((error) => { notify(getErrorMessage(error)); setFile(null); });
    return () => { active = false; };
  }, [file, notify]);

  // Load the overlay image so the preview can draw it, and release its URL when replaced.
  useEffect(() => {
    if (!wm.imageSrc) { setOverlay(null); return undefined; }
    let active = true;
    const image = new Image();
    image.onload = () => { if (active) setOverlay(image); };
    image.onerror = () => { if (active) notify('The watermark image could not be loaded.'); };
    image.src = wm.imageSrc;
    const src = wm.imageSrc;
    return () => { active = false; if (src.startsWith('blob:')) URL.revokeObjectURL(src); };
  }, [wm.imageSrc, notify]);

  useEffect(() => { render(); }, [render, imageSize]);

  const chooseOverlay = (files) => {
    const next = files[0];
    if (!next) return;
    if (!next.type.startsWith('image/')) { notify('Choose an image file for the watermark.', 'warning', { title: 'Not an image' }); return; }
    update({ type: 'image', imageSrc: URL.createObjectURL(next) });
  };

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const res = await applyWatermark(file, exportOptions());
      setResult(res);
      addItem({ name: res.name, blob: res.blob, size: res.blob.size, source: 'Watermark Studio' });
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  const needsOverlay = wm.type === 'image' && !wm.imageSrc;

  return (
    <PageTransition>
      <PageHeader icon={ShieldCheck} accent="error" title="Watermark Studio" description="Protect your images with a text or logo watermark. The preview is exactly what you'll get." />

      {!file ? (
        <Dropzone onFiles={handleFiles} accept={IMAGE_ACCEPT} multiple={false} formats={IMAGE_FORMAT_CHIPS} label="Drop an image to watermark" sublabel="You'll see a live preview while you adjust" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            {result && (
              <ResultsBanner
                summary={{ done: 1, failed: 0, originalSize: file.size, newSize: result.newSize, saved: 0, percent: 0 }}
                onDownloadAll={() => downloadBlob(result.blob, result.name)}
                noun="image"
              />
            )}
            <Panel bodyClassName="!p-3">
              <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#0b1220_0%_25%,#0f172a_0%_50%)] bg-[length:20px_20px]">
                <canvas ref={canvasRef} aria-label="Watermark preview" className="max-h-[60vh] max-w-full object-contain" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="min-w-0 truncate text-sm text-dark-200" title={file.name}><span className="font-semibold">{file.name}</span> <span className="text-dark-500">· {imageSize.width} × {imageSize.height} · {formatBytes(file.size)}</span></p>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); }}>Choose another</Button>
              </div>
            </Panel>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start" aria-label="Watermark settings">
            <Panel title="Watermark" bodyClassName="space-y-5">
              <Segmented ariaLabel="Watermark type" fullWidth value={wm.type} onChange={(type) => update({ type })} options={[{ value: 'text', label: 'Text', icon: Type }, { value: 'image', label: 'Logo / image', icon: ImageIcon }]} />

              {wm.type === 'text' ? (
                <>
                  <TextInput label="Text" value={wm.text} onChange={(event) => update({ text: event.target.value })} />
                  <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <Select label="Font" value={wm.fontFamily} onChange={(event) => update({ fontFamily: event.target.value })}>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="monospace">Monospace</option>
                    </Select>
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-dark-400">Color
                      <input type="color" aria-label="Text color" value={wm.color} onChange={(event) => update({ color: event.target.value })} className="h-[38px] w-14 cursor-pointer rounded-lg border border-white/10 bg-dark-900/60 p-1" />
                    </label>
                  </div>
                  <Slider label="Size" value={wm.scale} min={0.1} max={3} step={0.05} format={(value) => `${value.toFixed(2)}×`} onChange={(scale) => update({ scale })} />
                </>
              ) : (
                <>
                  <div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-dark-900/40 px-3 py-5 text-sm text-dark-300 transition-colors hover:border-secondary-400/50 hover:text-dark-100 focus-within:outline focus-within:outline-2 focus-within:outline-secondary-400">
                      <input type="file" accept="image/*" className="sr-only" onChange={(event) => { chooseOverlay(Array.from(event.target.files)); event.target.value = ''; }} />
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                      {wm.imageSrc ? 'Choose a different image' : 'Choose a logo or image'}
                    </label>
                    {needsOverlay && <p className="mt-2 text-xs text-warning-400">Choose an image to place on your photo.</p>}
                  </div>
                  <Slider label="Size" value={wm.imageSize} min={5} max={80} unit="% of width" onChange={(imageSize) => update({ imageSize })} />
                </>
              )}

              <Slider label="Opacity" value={wm.opacity} onChange={(opacity) => update({ opacity })} />
              <Slider label="Rotation" value={wm.rotation} min={-180} max={180} unit="°" onChange={(rotation) => update({ rotation })} />

              <div>
                <SectionLabel>Position</SectionLabel>
                <div role="radiogroup" aria-label="Position" className="grid max-w-[190px] grid-cols-3 gap-1.5">
                  {POSITIONS.map(([value, glyph, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={wm.position === value}
                      aria-label={label}
                      title={label}
                      onClick={() => update({ position: value })}
                      className={`flex h-10 items-center justify-center rounded-lg text-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 ${wm.position === value ? 'bg-secondary-500 text-dark-950 shadow shadow-secondary-500/25' : 'bg-white/5 text-dark-300 hover:bg-white/10'}`}
                    >
                      {glyph}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <Button size="lg" className="w-full" onClick={apply} disabled={processing || needsOverlay} loading={processing}>
                  {processing ? 'Applying…' : result ? 'Apply again' : 'Apply watermark'}
                </Button>
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </PageTransition>
  );
}
