import { useState, useCallback, useRef, useEffect } from 'react';
import { Wand2, Trash2, RotateCw, FlipHorizontal, FlipVertical, Crop, Undo2, Redo2, Eye, Download } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import Dropzone from '@/components/Dropzone';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import Panel, { SectionLabel } from '@/components/ui/Panel';
import ResultsBanner from '@/components/ui/ResultsBanner';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { NumberInput, Select, Slider, Toggle } from '@/components/ui/Controls';
import { useSupportedFormats } from '@/hooks/useSupportedFormats';
import { IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import {
  applyAdjustments,
  CROP_ASPECT_RATIOS,
  cropImage,
  getCenteredCropRect,
  getDefaultOutputFormat,
  loadImage,
  SOCIAL_MEDIA_PRESETS,
  transformCanvas,
} from '@/services/imageService';
import { downloadBlob } from '@/utils/zip';
import { useDownloads } from '@/context/DownloadContext';
import { getErrorMessage, useFeedback } from '@/context/FeedbackContext';

const defaultAdjustments = {
  rotate: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  sharpen: false,
  grayscale: false,
  sepia: false,
  vintage: false,
  blackAndWhite: false,
  negative: false,
  hue: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  gamma: 1,
  gaussianBlur: 0,
  pixelate: 0,
  emboss: false,
  edgeDetection: false,
  cartoon: false,
  roundedCorners: 0,
  borderWidth: 0,
  borderColor: '#ffffff',
  vignette: 0,
  shadow: 0,
  glow: 0,
  reflection: false,
  reflectionOpacity: 25,
  noise: 0,
  mosaic: 0,
  padding: 0,
  backgroundColor: '',
  canvasWidth: 0,
  canvasHeight: 0,
  canvasMode: 'fit',
  aspectLock: true,
  mockup: '',
  outputFormat: '',
  quality: 92,
};
export default function ImageEditor() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState(null);
  const [adjustments, setAdjustments] = useState(defaultAdjustments);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropEnabled, setCropEnabled] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [history, setHistory] = useState({ past: [], future: [] });
  const [compare, setCompare] = useState(false);
  const [tab, setTab] = useState('light');
  const supportedFormats = useSupportedFormats();
  const [compareBlob, setCompareBlob] = useState(null);
  const [circlePreview, setCirclePreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const cropStartRef = useRef(null);
  const { addItem } = useDownloads();
  const { notify } = useFeedback();

  const handleFiles = useCallback((files) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setResult(null);
    setAdjustments(defaultAdjustments);
    setCropEnabled(false);
    setHistory({ past: [], future: [] });
    setCompare(false);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    if (!previewUrl || !file) return;
    let active = true;
    loadImage(file).then(({ img, width, height }) => {
      if (!active) return;
      imgRef.current = img;
      setImageSize({ width, height });
      setCrop({ x: 0, y: 0, width, height });
      renderPreview();
    }).catch(() => {
      if (active) notify('The selected image could not be loaded.');
    });
    return () => {
      active = false;
      URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, file, notify]);

  useEffect(() => {
    if (imgRef.current) renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustments]);

  useEffect(() => {
    if (!result?.blob) {
      setResultPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(result.blob);
    setResultPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  // Snapshot of the live preview, so before/after works without having to apply the edit first.
  const compareUrl = useObjectUrl(compare && !result ? compareBlob : null);
  useEffect(() => {
    if (!compare || result) {
      setCompareBlob(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      canvasRef.current?.toBlob((blob) => blob && setCompareBlob(blob), 'image/png');
    }, 150);
    return () => clearTimeout(timer);
  }, [compare, result, adjustments]);

  const renderPreview = () => {
    const img = imgRef.current;
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (adjustments.rotate === 90 || adjustments.rotate === 270) {
      [w, h] = [h, w];
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (adjustments.rotate) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate((adjustments.rotate * Math.PI) / 180);
      ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
    }
    if (adjustments.flipH) { ctx.translate(img.naturalWidth, 0); ctx.scale(-1, 1); }
    if (adjustments.flipV) { ctx.translate(0, img.naturalHeight); ctx.scale(1, -1); }
    const filters = [];
    if (adjustments.brightness !== 100) filters.push(`brightness(${adjustments.brightness}%)`);
    if (adjustments.contrast !== 100) filters.push(`contrast(${adjustments.contrast}%)`);
    if (adjustments.saturation !== 100) filters.push(`saturate(${adjustments.saturation}%)`);
    if (adjustments.hue) filters.push(`hue-rotate(${adjustments.hue}deg)`);
    if (adjustments.exposure) filters.push(`brightness(${2 ** adjustments.exposure})`);
    if (adjustments.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
    if (adjustments.gaussianBlur > 0) filters.push(`blur(${adjustments.gaussianBlur}px)`);
    if (adjustments.grayscale) filters.push('grayscale(100%)');
    if (adjustments.sepia) filters.push('sepia(100%)');
    if (adjustments.negative) filters.push('invert(100%)');
    if (adjustments.vintage) filters.push('sepia(45%) contrast(90%) saturate(80%)');
    if (adjustments.blackAndWhite) filters.push('grayscale(100%) contrast(150%)');
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';
  };

  const recordHistory = () => {
    setHistory((state) => ({
      past: [...state.past, { adjustments, crop, cropEnabled }].slice(-30),
      future: [],
    }));
  };
  const update = (key, value) => {
    recordHistory();
    setResult(null);
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };
  const updateCanvasDimension = (key, value) => {
    const dimension = Math.max(0, Number(value) || 0);
    recordHistory();
    setResult(null);
    setAdjustments((previous) => {
      const next = { ...previous, [key]: dimension };
      const ratio = imageSize.width / imageSize.height;
      if (previous.aspectLock && ratio > 0) {
        if (key === 'canvasWidth') next.canvasHeight = dimension ? Math.round(dimension / ratio) : 0;
        if (key === 'canvasHeight') next.canvasWidth = dimension ? Math.round(dimension * ratio) : 0;
      }
      return next;
    });
  };

  const undo = () => {
    if (!history.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory({ past: history.past.slice(0, -1), future: [{ adjustments, crop, cropEnabled }, ...history.future] });
    setResult(null);
    setAdjustments(previous.adjustments);
    setCrop(previous.crop);
    setCropEnabled(previous.cropEnabled);
  };
  const redo = () => {
    if (!history.future.length) return;
    const [next, ...future] = history.future;
    setHistory({ past: [...history.past, { adjustments, crop, cropEnabled }], future });
    setResult(null);
    setAdjustments(next.adjustments);
    setCrop(next.crop);
    setCropEnabled(next.cropEnabled);
  };
  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo. Always call the latest handlers.
  const historyActions = useRef({});
  historyActions.current = { undo, redo };
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      const typing = target instanceof HTMLElement
        && (target.isContentEditable || target.tagName === 'TEXTAREA'
          || (target.tagName === 'INPUT' && !['range', 'checkbox', 'radio'].includes(target.type)));
      if (typing) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        historyActions.current.undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        historyActions.current.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const reset = () => {
    recordHistory();
    setResult(null);
    setAdjustments(defaultAdjustments);
    setCrop({ x: 0, y: 0, width: imageSize.width, height: imageSize.height });
    setCropEnabled(false);
  };

  const pointInImage = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(imageSize.width, Math.round((event.clientX - rect.left) * imageSize.width / rect.width))),
      y: Math.max(0, Math.min(imageSize.height, Math.round((event.clientY - rect.top) * imageSize.height / rect.height))),
    };
  };

  const beginCrop = (event) => {
    if (!cropEnabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    recordHistory();
    setResult(null);
    cropStartRef.current = pointInImage(event);
    setCrop({ ...cropStartRef.current, width: 1, height: 1 });
  };

  const updateCropSelection = (event) => {
    if (!cropEnabled || !cropStartRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointInImage(event);
    const start = cropStartRef.current;
    setCrop({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.max(1, Math.abs(point.x - start.x)),
      height: Math.max(1, Math.abs(point.y - start.y)),
    });
  };

  const finishCrop = (event) => {
    updateCropSelection(event);
    cropStartRef.current = null;
  };

  const handleApply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      let source = file;
      if (cropEnabled) {
        const cropped = await cropImage(file, crop);
        source = new File([cropped.blob], cropped.name, { type: cropped.blob.type || file.type });
      }
      const format = adjustments.outputFormat || getDefaultOutputFormat(file);
      const adjusted = await applyAdjustments(source, { ...adjustments, outputFormat: format });
      const visual = await transformCanvas(new File([adjusted.blob], adjusted.name, { type: adjusted.blob.type }), {
        roundedCorners: adjustments.roundedCorners,
        borderWidth: adjustments.borderWidth,
        borderColor: adjustments.borderColor,
        vignette: adjustments.vignette,
        shadow: adjustments.shadow,
        glow: adjustments.glow,
        reflection: adjustments.reflection,
        reflectionOpacity: adjustments.reflectionOpacity / 100,
        noise: adjustments.noise,
        mosaic: adjustments.mosaic,
        padding: adjustments.padding,
        backgroundColor: adjustments.backgroundColor,
        width: adjustments.canvasWidth || undefined,
        height: adjustments.canvasHeight || undefined,
        mode: adjustments.canvasMode,
        mockup: adjustments.mockup,
        outputFormat: format,
        quality: adjustments.quality / 100,
      });
      const res = visual;
      setResult(res);
      addItem({ name: res.name, blob: res.blob, size: res.blob.size, source: 'Image Editor' });
    } catch (err) {
      notify(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const sliderMeta = {
    brightness: { label: 'Brightness', min: 0, max: 200, unit: '%' },
    contrast: { label: 'Contrast', min: 0, max: 200, unit: '%' },
    saturation: { label: 'Saturation', min: 0, max: 200, unit: '%' },
    exposure: { label: 'Exposure', min: -2, max: 2, step: 0.1, unit: ' EV' },
    hue: { label: 'Hue', min: -180, max: 180, unit: '°' },
    temperature: { label: 'Temperature', min: -100, max: 100, unit: '' },
    tint: { label: 'Tint', min: -100, max: 100, unit: '' },
    gamma: { label: 'Gamma', min: 0.2, max: 3, step: 0.1, unit: '' },
    blur: { label: 'Blur', min: 0, max: 20, unit: 'px' },
    gaussianBlur: { label: 'Gaussian blur', min: 0, max: 20, unit: 'px' },
    pixelate: { label: 'Pixelate', min: 0, max: 50, unit: 'px' },
    noise: { label: 'Noise', min: 0, max: 50, unit: '' },
    mosaic: { label: 'Mosaic', min: 0, max: 50, unit: 'px' },
    vignette: { label: 'Vignette', min: 0, max: 100, unit: '%' },
    glow: { label: 'Glow', min: 0, max: 50, unit: 'px' },
    roundedCorners: { label: 'Rounded corners', min: 0, max: 200, unit: 'px' },
    borderWidth: { label: 'Border', min: 0, max: 50, unit: 'px' },
    shadow: { label: 'Shadow', min: 0, max: 50, unit: 'px' },
    padding: { label: 'Padding', min: 0, max: 200, unit: 'px' },
  };
  const renderSlider = (key) => {
    const meta = sliderMeta[key];
    return <Slider key={key} label={meta.label} value={adjustments[key]} min={meta.min} max={meta.max} step={meta.step || 1} unit={meta.unit} onChange={(value) => update(key, value)} />;
  };

  const LIGHT = ['brightness', 'contrast', 'saturation', 'exposure', 'hue', 'temperature', 'tint', 'gamma'];
  const EFFECT_SLIDERS = ['blur', 'gaussianBlur', 'pixelate', 'noise', 'mosaic', 'vignette', 'glow'];
  const FILTERS = [
    ['grayscale', 'Grayscale'], ['sepia', 'Sepia'], ['vintage', 'Vintage'], ['blackAndWhite', 'B&W'],
    ['negative', 'Negative'], ['sharpen', 'Sharpen'], ['emboss', 'Emboss'], ['edgeDetection', 'Edges'], ['cartoon', 'Cartoon'],
  ];
  const FRAME = ['roundedCorners', 'borderWidth', 'shadow', 'padding', 'backgroundColor', 'mockup', 'reflection', 'canvasWidth', 'canvasHeight'];
  const changed = (keys) => keys.some((key) => adjustments[key] !== defaultAdjustments[key]);
  const tabs = [
    { id: 'light', label: 'Color', badge: changed(LIGHT) },
    { id: 'effects', label: 'Effects', badge: changed([...EFFECT_SLIDERS, ...FILTERS.map(([key]) => key)]) },
    { id: 'crop', label: 'Crop', badge: cropEnabled || changed(['rotate', 'flipH', 'flipV']) },
    { id: 'frame', label: 'Frame', badge: changed(FRAME) },
    { id: 'export', label: 'Export', badge: adjustments.outputFormat !== '' || adjustments.quality !== defaultAdjustments.quality },
  ];
  const exportFormat = adjustments.outputFormat || getDefaultOutputFormat(file || { name: 'image.png' });

  const cropIsValid =
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.width > 0 &&
    crop.height > 0 &&
    crop.x + crop.width <= imageSize.width &&
    crop.y + crop.height <= imageSize.height;

  return (
    <PageTransition>
      <PageHeader icon={Wand2} accent="accent" title="Image Editor" description="Adjust color, apply filters, crop and frame, and compare with the original at any time." />

      {!file ? (
        <Dropzone onFiles={handleFiles} accept="image/*,.tif,.tiff,.heic,.heif,.avif,.ico" multiple={false} formats={IMAGE_FORMAT_CHIPS} label="Drop an image to edit" sublabel="Edits are previewed live. Nothing leaves your device." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Preview */}
          <div className="min-w-0 space-y-4">
            {result && (
              <ResultsBanner
                summary={{
                  done: 1, failed: 0, originalSize: file.size, newSize: result.newSize,
                  saved: file.size - result.newSize, percent: ((file.size - result.newSize) / file.size) * 100,
                }}
                onDownloadAll={() => downloadBlob(result.blob, result.name)}
                showSavings
                noun="image"
              />
            )}
            <Panel bodyClassName="!p-3">
              <div className={`flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#0b1220_0%_25%,#0f172a_0%_50%)] bg-[length:20px_20px] ${compare ? 'gap-3' : ''}`}>
                <div className="relative inline-flex max-w-full">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={beginCrop}
                    onPointerMove={updateCropSelection}
                    onPointerUp={finishCrop}
                    onPointerCancel={finishCrop}
                    aria-label={cropEnabled ? 'Drag to select crop area' : 'Edited image preview'}
                    className={`block max-h-[60vh] max-w-full object-contain ${result || compare ? 'hidden' : ''} ${cropEnabled ? 'cursor-crosshair touch-none' : ''}`}
                    style={{
                      clipPath: circlePreview ? 'circle(50% at 50% 50%)' : undefined,
                      borderRadius: adjustments.roundedCorners ? `${adjustments.roundedCorners}px` : undefined,
                      border: adjustments.borderWidth ? `${adjustments.borderWidth}px solid ${adjustments.borderColor}` : undefined,
                      boxShadow: adjustments.shadow ? `0 ${adjustments.shadow / 2}px ${adjustments.shadow}px rgba(0,0,0,.45)` : undefined,
                    }}
                  />
                  {result && resultPreviewUrl && !compare && (
                    <img
                      src={resultPreviewUrl}
                      alt="Processed image"
                      className="block max-h-[60vh] max-w-full object-contain"
                      style={circlePreview ? { clipPath: 'circle(50% at 50% 50%)' } : undefined}
                    />
                  )}
                  {compare && (
                    <div className="w-[720px] max-w-full">
                      {(result ? resultPreviewUrl : compareUrl) ? (
                        <BeforeAfterSlider
                          before={previewUrl}
                          after={result ? resultPreviewUrl : compareUrl}
                          beforeLabel="Original"
                          afterLabel={result ? 'Edited (applied)' : 'Edited (preview)'}
                        />
                      ) : (
                        <SkeletonRegion label="Rendering comparison"><Skeleton className="h-[min(60vh,420px)] w-full rounded-xl" /></SkeletonRegion>
                      )}
                    </div>
                  )}
                  {cropEnabled && crop.width > 0 && imageSize.width > 0 && (
                    <div className="pointer-events-none absolute border-2 border-secondary-400 bg-secondary-400/15" style={{
                      left: `${crop.x / imageSize.width * 100}%`,
                      top: `${crop.y / imageSize.height * 100}%`,
                      width: `${crop.width / imageSize.width * 100}%`,
                      height: `${crop.height / imageSize.height * 100}%`,
                    }} />
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="min-w-0 truncate text-sm text-dark-200" title={file.name}><span className="font-semibold">{file.name}</span> <span className="text-dark-500">· {imageSize.width} × {imageSize.height}</span></p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={cropEnabled} aria-pressed={compare} onClick={() => setCompare((value) => !value)}>
                    <Eye className="h-4 w-4" /> {compare ? 'Hide comparison' : 'Compare before/after'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Choose another</Button>
                </div>
              </div>
            </Panel>
          </div>

          {/* Controls */}
          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start" aria-label="Editor controls">
            <Panel bodyClassName="!p-4 space-y-4">
              <Tabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Editor sections" idPrefix="editor" />

              <div className="max-h-[52vh] overflow-y-auto pr-1 scrollbar-thin">
                <TabPanel id="light" value={tab} idPrefix="editor">
                  {LIGHT.map(renderSlider)}
                </TabPanel>

                <TabPanel id="effects" value={tab} idPrefix="editor">
                  <div>
                    <SectionLabel>Filters</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {FILTERS.map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={adjustments[key]}
                          onClick={() => update(key, !adjustments[key])}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400 ${adjustments[key] ? 'border-secondary-500/50 bg-secondary-500/15 text-secondary-200' : 'border-white/10 bg-white/5 text-dark-300 hover:bg-white/10'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionLabel>Effects</SectionLabel>
                    {EFFECT_SLIDERS.map(renderSlider)}
                  </div>
                </TabPanel>

                <TabPanel id="crop" value={tab} idPrefix="editor">
                  <div>
                    <SectionLabel>Rotate &amp; flip</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={() => update('rotate', (adjustments.rotate + 270) % 360)}><RotateCw className="h-4 w-4 -scale-x-100" /> Left</Button>
                      <Button variant="ghost" size="sm" onClick={() => update('rotate', (adjustments.rotate + 90) % 360)}><RotateCw className="h-4 w-4" /> Right</Button>
                      <Button variant={adjustments.flipH ? 'secondary' : 'ghost'} size="sm" aria-pressed={adjustments.flipH} onClick={() => update('flipH', !adjustments.flipH)}><FlipHorizontal className="h-4 w-4" /> Flip H</Button>
                      <Button variant={adjustments.flipV ? 'secondary' : 'ghost'} size="sm" aria-pressed={adjustments.flipV} onClick={() => update('flipV', !adjustments.flipV)}><FlipVertical className="h-4 w-4" /> Flip V</Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionLabel>Crop</SectionLabel>
                    <Toggle label="Crop the image" description="Drag on the preview, or enter exact pixel values." checked={cropEnabled} onChange={(checked) => { recordHistory(); setResult(null); setCropEnabled(checked); }} />
                    {cropEnabled && (
                      <>
                        <Select
                          label="Aspect ratio"
                          aria-label="Crop aspect preset"
                          defaultValue=""
                          onChange={(event) => {
                            const preset = event.target.value;
                            if (!preset) return;
                            recordHistory();
                            setCrop(getCenteredCropRect(imageSize.width, imageSize.height, CROP_ASPECT_RATIOS[preset]));
                            setResult(null);
                          }}
                        >
                          <option value="">Free crop</option>
                          {Object.keys(CROP_ASPECT_RATIOS).map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                        </Select>
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant={circlePreview ? 'secondary' : 'ghost'} size="sm" onClick={() => setCirclePreview((value) => !value)}>Circle preview</Button>
                          {Object.entries(SOCIAL_MEDIA_PRESETS).map(([name, dimensions]) => (
                            <Button key={name} variant="ghost" size="sm" onClick={() => {
                              recordHistory();
                              setCrop(getCenteredCropRect(imageSize.width, imageSize.height, dimensions.width / dimensions.height));
                              setCropEnabled(true);
                              setResult(null);
                            }}>{name.replace(/([A-Z])/g, ' $1')}</Button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[['x', 'Left (px)', imageSize.width], ['y', 'Top (px)', imageSize.height], ['width', 'Width (px)', imageSize.width], ['height', 'Height (px)', imageSize.height]].map(([key, label, max]) => (
                            <NumberInput
                              key={key}
                              label={label}
                              min={key === 'width' || key === 'height' ? 1 : 0}
                              max={max}
                              value={crop[key]}
                              onChange={(value) => { recordHistory(); setResult(null); setCrop((previous) => ({ ...previous, [key]: value === '' ? 0 : value })); }}
                            />
                          ))}
                        </div>
                        {!cropIsValid && <p className="text-xs text-error-400">Crop area must fit within the image.</p>}
                      </>
                    )}
                  </div>
                </TabPanel>

                <TabPanel id="frame" value={tab} idPrefix="editor">
                  {['roundedCorners', 'borderWidth', 'shadow', 'padding'].map(renderSlider)}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-dark-400">Border color
                      <input type="color" value={adjustments.borderColor} onChange={(event) => update('borderColor', event.target.value)} className="h-[38px] w-full cursor-pointer rounded-lg border border-white/10 bg-dark-900/60 p-1" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-dark-400">Background
                      <input type="color" value={adjustments.backgroundColor || '#ffffff'} disabled={!adjustments.backgroundColor} onChange={(event) => update('backgroundColor', event.target.value)} className="h-[38px] w-full cursor-pointer rounded-lg border border-white/10 bg-dark-900/60 p-1 disabled:opacity-40" />
                    </label>
                  </div>
                  <Toggle label="Transparent background" checked={!adjustments.backgroundColor} onChange={(checked) => update('backgroundColor', checked ? '' : '#ffffff')} />
                  <Toggle label="Reflection" checked={adjustments.reflection} onChange={(checked) => update('reflection', checked)} />
                  <Select label="Screenshot frame" value={adjustments.mockup} onChange={(event) => update('mockup', event.target.value)}>
                    <option value="">None</option>
                    <option value="browser">Browser window</option>
                    <option value="device">Device</option>
                  </Select>
                  <div className="space-y-4">
                    <SectionLabel>Canvas size</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput label="Width" min={0} placeholder={`${imageSize.width}`} value={adjustments.canvasWidth || ''} onChange={(value) => updateCanvasDimension('canvasWidth', value)} />
                      <NumberInput label="Height" min={0} placeholder={`${imageSize.height}`} value={adjustments.canvasHeight || ''} onChange={(value) => updateCanvasDimension('canvasHeight', value)} />
                    </div>
                    <Select label="Fit mode" value={adjustments.canvasMode} onChange={(event) => update('canvasMode', event.target.value)}>
                      <option value="fit">Fit &amp; center</option>
                      <option value="fill">Fill &amp; crop</option>
                      <option value="stretch">Stretch</option>
                    </Select>
                    <Toggle label="Lock aspect ratio" checked={adjustments.aspectLock} onChange={(checked) => update('aspectLock', checked)} />
                  </div>
                </TabPanel>

                <TabPanel id="export" value={tab} idPrefix="editor">
                  <Select label="Format" value={exportFormat} onChange={(event) => update('outputFormat', event.target.value)}>
                    {supportedFormats.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
                  </Select>
                  {(exportFormat === 'jpg' || exportFormat === 'webp') && (
                    <Slider label="Quality" value={adjustments.quality} min={10} max={100} onChange={(value) => update('quality', value)} minLabel="Smaller file" maxLabel="Better quality" />
                  )}
                  <p className="text-xs text-dark-400">The original is never changed. Edits are applied to a new file.</p>
                </TabPanel>
              </div>

              <div className="flex items-center gap-2 border-t border-white/10 pt-4">
                <Button variant="ghost" size="icon" onClick={undo} disabled={!history.past.length} aria-label="Undo edit" title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={redo} disabled={!history.future.length} aria-label="Redo edit" title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Reset all edits" title="Reset all edits"><Trash2 className="h-4 w-4" /></Button>
                <Button variant="primary" size="md" onClick={handleApply} disabled={processing || (cropEnabled && !cropIsValid)} loading={processing} className="flex-1">
                  Apply &amp; save
                </Button>
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </PageTransition>
  );
}
