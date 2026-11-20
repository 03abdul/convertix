import piexif from 'piexifjs';

export const IMAGE_FORMATS = {
  png: { ext: 'png', mime: 'image/png', label: 'PNG', lossless: true },
  jpg: { ext: 'jpg', mime: 'image/jpeg', label: 'JPG', lossless: false },
  jpeg: { ext: 'jpg', mime: 'image/jpeg', label: 'JPEG', lossless: false },
  webp: { ext: 'webp', mime: 'image/webp', label: 'WebP', lossless: false },
  bmp: { ext: 'bmp', mime: 'image/bmp', label: 'BMP', lossless: true },
  gif: { ext: 'gif', mime: 'image/gif', label: 'GIF', lossless: true },
};

export const SUPPORTED_INPUT_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff', 'avif', 'heic', 'heif', 'ico'];
export const MAX_IMAGE_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 100_000_000;

export const SOCIAL_MEDIA_PRESETS = {
  instagramPost: { width: 1080, height: 1080 },
  instagramStory: { width: 1080, height: 1920 },
  facebookPost: { width: 1200, height: 630 },
  facebookCover: { width: 851, height: 315 },
  linkedInBanner: { width: 1584, height: 396 },
  xHeader: { width: 1500, height: 500 },
  youtubeThumbnail: { width: 1280, height: 720 },
  youtubeBanner: { width: 2560, height: 1440 },
  pinterestPin: { width: 1000, height: 1500 },
};

export const CROP_ASPECT_RATIOS = {
  square: 1,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  instagram: 1,
  facebook: 1.91,
  linkedin: 1.91,
  youtube: 16 / 9,
};

const hasDOM = () => typeof document !== 'undefined';

// Works on the main thread (HTMLCanvasElement) and inside a Web Worker (OffscreenCanvas).
export function createCanvas(width = 1, height = 1) {
  if (hasDOM()) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height);
}

// HTMLImageElement and canvases expose naturalWidth; ImageBitmap (worker) only has width.
const imgW = (img) => img.naturalWidth ?? img.width;
const imgH = (img) => img.naturalHeight ?? img.height;

function mainThreadOnly(message) {
  const error = new Error(message);
  error.code = 'MAIN_THREAD_ONLY';
  return error;
}

export function validateImageFile(file) {
  const extension = getFormatFromExtension(file.name);
  if (!SUPPORTED_INPUT_FORMATS.includes(extension) && !file.type?.startsWith('image/')) {
    throw new Error(`${file.name}: unsupported image format.`);
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(`${file.name}: images must be smaller than 100 MB.`);
  }
}

export function isSupportedImageFile(file) {
  return SUPPORTED_INPUT_FORMATS.includes(getFormatFromExtension(file.name)) || file.type?.startsWith('image/');
}

export function getFormatFromExtension(filename) {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return null;
  return filename.substring(dot + 1).toLowerCase();
}

function getCanvasOutputFormat(extension) {
  if (extension === 'gif') return IMAGE_FORMATS.png;
  return IMAGE_FORMATS[extension] || IMAGE_FORMATS.jpg;
}

export function getDefaultOutputFormat(file) {
  const extension = getFormatFromExtension(file.name);
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }
  if (['avif', 'gif', 'ico'].includes(extension)) return 'png';
  return 'jpg';
}

function normalizeQuality(quality, fallback = 0.92) {
  if (quality == null) return fallback;
  const normalized = quality > 1 ? quality / 100 : quality;
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new Error('Image quality must be between 0 and 100.');
  }
  return normalized;
}

export function getCenteredCropRect(width, height, aspectRatio) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('Image dimensions must be positive numbers.');
  }
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error('Crop aspect ratio must be a positive number.');
  }

  let cropWidth = width;
  let cropHeight = height;
  if (width / height > aspectRatio) {
    cropWidth = Math.round(height * aspectRatio);
  } else {
    cropHeight = Math.round(width / aspectRatio);
  }

  return {
    x: Math.floor((width - cropWidth) / 2),
    y: Math.floor((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}

function getCropForPreset(width, height, preset) {
  const aspectRatio = typeof preset === 'number' ? preset : CROP_ASPECT_RATIOS[preset];
  if (aspectRatio == null) {
    throw new Error(`Unsupported crop preset: ${preset}`);
  }
  return getCenteredCropRect(width, height, aspectRatio);
}

export function loadImage(file) {
  const extension = getFormatFromExtension(file.name);
  if (extension === 'tif' || extension === 'tiff') {
    return loadTiff(file);
  }
  if (extension === 'heic' || extension === 'heif') {
    return loadHeic(file);
  }
  return loadImageBlob(file, file.name);
}

async function loadTiff(file) {
  const UTIF = await import('utif');
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (!ifds.length) throw new Error(`${file.name}: no image frame was found.`);
  const width = ifds[0].t256?.[0];
  const height = ifds[0].t257?.[0];
  if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
    throw new Error(`${file.name}: image dimensions exceed the 100-megapixel limit.`);
  }
  UTIF.decodeImage(buffer, ifds[0]);
  const pixels = UTIF.toRGBA8(ifds[0]);
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  canvas.naturalWidth = canvas.width;
  canvas.naturalHeight = canvas.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), canvas.width, canvas.height), 0, 0);
  return { img: canvas, url: null, width: canvas.width, height: canvas.height };
}

async function loadHeic(file) {
  // heic2any relies on DOM APIs, so HEIC/HEIF is decoded on the main thread only.
  if (!hasDOM()) throw mainThreadOnly(`${file.name}: HEIC/HEIF decoding runs on the main thread.`);
  let converted;
  try {
    const { default: heic2any } = await import('heic2any');
    converted = await heic2any({ blob: file, toType: 'image/png' });
  } catch (error) {
    throw new Error(`${file.name}: HEIC/HEIF decoding failed. ${error.message}`);
  }
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!(blob instanceof Blob)) throw new Error(`${file.name}: HEIC/HEIF decoder returned no image.`);
  return loadImageBlob(blob, file.name);
}

async function loadImageBlob(blob, name) {
  if (!hasDOM()) {
    // Web Worker: no <img>, decode straight to an ImageBitmap.
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      throw new Error(`Failed to load image: ${name}`);
    }
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      bitmap.close?.();
      throw new Error(`${name}: image dimensions exceed the 100-megapixel limit.`);
    }
    return { img: bitmap, url: null, width: bitmap.width, height: bitmap.height };
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (imgW(img) * imgH(img) > MAX_IMAGE_PIXELS) {
        reject(new Error(`${name}: image dimensions exceed the 100-megapixel limit.`));
        return;
      }
      resolve({ img, url, width: imgW(img), height: imgH(img) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${name}`));
    };
    img.src = url;
  });
}

export function canvasToBlob(canvas, mime, quality) {
  if (mime === 'image/bmp') {
    const { width, height } = canvas;
    const rowSize = Math.ceil((width * 3) / 4) * 4;
    const pixelOffset = 54;
    const buffer = new ArrayBuffer(pixelOffset + rowSize * height);
    const view = new DataView(buffer);
    const imageData = canvas.getContext('2d').getImageData(0, 0, width, height);

    view.setUint8(0, 0x42);
    view.setUint8(1, 0x4d);
    view.setUint32(2, buffer.byteLength, true);
    view.setUint32(10, pixelOffset, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, rowSize * height, true);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const source = ((height - 1 - y) * width + x) * 4;
        const destination = pixelOffset + y * rowSize + x * 3;
        const alpha = imageData.data[source + 3] / 255;
        view.setUint8(destination, Math.round(imageData.data[source + 2] * alpha + 255 * (1 - alpha)));
        view.setUint8(destination + 1, Math.round(imageData.data[source + 1] * alpha + 255 * (1 - alpha)));
        view.setUint8(destination + 2, Math.round(imageData.data[source] * alpha + 255 * (1 - alpha)));
      }
    }

    return Promise.resolve(new Blob([buffer], { type: 'image/bmp' }));
  }

  const verify = (blob) => {
    if (!blob) throw new Error('Failed to generate blob');
    // Browsers silently fall back to PNG for formats they cannot encode; surface that instead.
    if (blob.type && blob.type !== mime) {
      const label = Object.values(IMAGE_FORMATS).find((format) => format.mime === mime)?.label || mime;
      throw new Error(`This browser cannot encode ${label}. Choose a different output format.`);
    }
    return blob;
  };

  if (typeof canvas.convertToBlob === 'function') {
    // OffscreenCanvas (Web Worker)
    return canvas.convertToBlob({ type: mime, quality: normalizeQuality(quality) }).then(verify);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        try {
          resolve(verify(blob));
        } catch (error) {
          reject(error);
        }
      },
      mime,
      normalizeQuality(quality)
    );
  });
}

let supportedFormatsPromise;

async function canEncode(mime) {
  try {
    const canvas = createCanvas(1, 1);
    const encode = typeof canvas.convertToBlob === 'function'
      ? canvas.convertToBlob({ type: mime, quality: 0.5 })
      : new Promise((resolve) => canvas.toBlob(resolve, mime, 0.5));
    // Never let an environment where toBlob does not call back block the UI forever.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
    const blob = await Promise.race([encode, timeout]);
    return !!blob && blob.type === mime;
  } catch {
    return false;
  }
}

/** Output formats this browser can really encode (PNG, JPG and BMP always work; WebP depends on the browser). */
export function getSupportedOutputFormats() {
  supportedFormatsPromise ??= (async () => {
    const formats = ['png', 'jpg'];
    if (await canEncode('image/webp')) formats.push('webp');
    formats.push('bmp');
    return formats;
  })();
  return supportedFormatsPromise;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image metadata'));
    reader.readAsDataURL(blob);
  });
}

async function preserveJpegMetadata(source, output) {
  const [sourceDataUrl, outputDataUrl] = await Promise.all([
    blobToDataUrl(source),
    blobToDataUrl(output),
  ]);
  const exif = piexif.load(sourceDataUrl);
  const exifBytes = piexif.dump(exif);
  const outputWithExif = piexif.insert(exifBytes, outputDataUrl);
  const response = await fetch(outputWithExif);
  return response.blob();
}

export async function convertFormat(file, targetFormat, quality, options = {}) {
  validateImageFile(file);
  if (!IMAGE_FORMATS[targetFormat] || targetFormat === 'gif') {
    throw new Error(`Unsupported output format: ${targetFormat}`);
  }
  const { img } = await loadImage(file);
  const canvas = createCanvas();
  canvas.width = imgW(img);
  canvas.height = imgH(img);
  const ctx = canvas.getContext('2d');

  if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  const format = IMAGE_FORMATS[targetFormat];

  const q = targetFormat === 'png' || targetFormat === 'bmp' ? undefined : (quality != null ? quality : 0.92);
  let blob = await canvasToBlob(canvas, format.mime, q);
  if (
    options.preserveMetadata &&
    (targetFormat === 'jpg' || targetFormat === 'jpeg') &&
    ['jpg', 'jpeg'].includes(getFormatFromExtension(file.name))
  ) {
    blob = await preserveJpegMetadata(file, blob);
  }

  const originalName = file.name;
  const dot = originalName.lastIndexOf('.');
  const baseName = dot > 0 ? originalName.substring(0, dot) : originalName;
  const newName = `${baseName}.${format.ext}`;

  return {
    blob,
    name: newName,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
  };
}

function getExifResolution(exif) {
  const resolution = exif?.['0th']?.[piexif.ImageIFD.XResolution];
  if (!Array.isArray(resolution) || resolution.length !== 2 || resolution[1] === 0) return null;
  const resolutionUnit = exif?.['0th']?.[piexif.ImageIFD.ResolutionUnit];
  const dotsPerUnit = resolution[0] / resolution[1];
  if (resolutionUnit === 2) return dotsPerUnit;
  if (resolutionUnit === 3) return Math.round(dotsPerUnit * 2.54);
  return null;
}

async function getRasterDpi(file, extension) {
  if (extension === 'png') {
    const bytes = new DataView(await file.arrayBuffer());
    for (let offset = 8; offset + 12 <= bytes.byteLength;) {
      const length = bytes.getUint32(offset, false);
      if (offset + 12 + length > bytes.byteLength) break;
      const type = String.fromCharCode(...new Uint8Array(bytes.buffer, offset + 4, 4));
      if (type === 'pHYs' && length >= 9 && bytes.getUint8(offset + 16) === 1) {
        return Math.round(bytes.getUint32(offset + 8, false) * 0.0254);
      }
      offset += 12 + length;
    }
  }
  if (extension === 'bmp') {
    const bytes = new DataView(await file.arrayBuffer());
    if (bytes.byteLength >= 46) {
      const pixelsPerMeter = bytes.getInt32(38, true);
      if (pixelsPerMeter > 0) return Math.round(pixelsPerMeter * 0.0254);
    }
  }
  return null;
}

export async function getImageMetadata(file) {
  validateImageFile(file);
  const { width, height } = await loadImage(file);
  const extension = getFormatFromExtension(file.name);
  let exif = null;
  let dpi = null;
  let colorSpace = null;

  if (extension === 'jpg' || extension === 'jpeg') {
    const dataUrl = await blobToDataUrl(file);
    exif = piexif.load(dataUrl);
    dpi = getExifResolution(exif);
    const colorSpaceValue = exif?.Exif?.[piexif.ExifIFD.ColorSpace];
    colorSpace = colorSpaceValue === 1 ? 'sRGB' : colorSpaceValue === 65535 ? 'Uncalibrated' : null;
  } else {
    dpi = await getRasterDpi(file, extension);
  }

  return {
    name: file.name,
    format: extension || file.type?.split('/')[1] || 'unknown',
    width,
    height,
    resolution: `${width} x ${height}`,
    aspectRatio: width / height,
    fileSize: file.size,
    dpi,
    colorSpace,
    exif,
  };
}

export async function removeImageMetadata(file, quality) {
  validateImageFile(file);
  const extension = getFormatFromExtension(file.name);
  const targetFormat = ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)
    ? (extension === 'jpeg' ? 'jpg' : extension)
    : 'png';
  return convertFormat(file, targetFormat, quality, { preserveMetadata: false });
}

export async function compressImage(file, quality) {
  validateImageFile(file);
  const { img, width, height } = await loadImage(file);
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);

  const ext = getFormatFromExtension(file.name);
  const keepFormat = ['jpg', 'jpeg', 'webp'].includes(ext);
  const mime = keepFormat ? IMAGE_FORMATS[ext].mime : 'image/jpeg';
  const q = quality != null ? quality : 0.7;

  const blob = await canvasToBlob(canvas, mime, q);

  return {
    blob,
    name: keepFormat ? file.name : replaceExtension(file.name, 'jpg'),
    originalSize: file.size,
    newSize: blob.size,
    width,
    height,
  };
}

export async function resizeImage(file, targetWidth, targetHeight, maintainAspect, quality, options = {}) {
  validateImageFile(file);
  const { img } = await loadImage(file);
  const percentage = options.percentage;
  if (percentage != null && (!Number.isFinite(percentage) || percentage <= 0)) {
    throw new Error('Resize percentage must be a positive number.');
  }
  const scale = percentage == null ? 1 : percentage / 100;
  const requestedWidth = percentage == null
    ? (targetWidth ? Math.round(targetWidth) : imgW(img))
    : Math.round(imgW(img) * scale);
  const requestedHeight = percentage == null
    ? (targetHeight ? Math.round(targetHeight) : imgH(img))
    : Math.round(imgH(img) * scale);
  if (
    !Number.isInteger(requestedWidth) ||
    !Number.isInteger(requestedHeight) ||
    requestedWidth < 1 ||
    requestedHeight < 1 ||
    requestedWidth * requestedHeight > MAX_IMAGE_PIXELS
  ) {
    throw new Error(`Resize dimensions must be positive and no larger than ${MAX_IMAGE_PIXELS} pixels.`);
  }

  const mode = options.mode || 'fit';
  if (!['fit', 'fill', 'stretch'].includes(mode)) {
    throw new Error(`Unsupported resize mode: ${mode}`);
  }

  let w = requestedWidth;
  let h = requestedHeight;
  if (mode === 'fit' && maintainAspect && !options.exactCanvas) {
    const ratio = Math.min(requestedWidth / imgW(img), requestedHeight / imgH(img));
    w = Math.max(1, Math.round(imgW(img) * ratio));
    h = Math.max(1, Math.round(imgH(img) * ratio));
  } else if (mode === 'fit' && maintainAspect && options.exactCanvas) {
    const ratio = Math.min(requestedWidth / imgW(img), requestedHeight / imgH(img));
    w = requestedWidth;
    h = requestedHeight;
    const drawWidth = Math.round(imgW(img) * ratio);
    const drawHeight = Math.round(imgH(img) * ratio);
    const canvas = createCanvas();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable in this browser.');
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, Math.floor((w - drawWidth) / 2), Math.floor((h - drawHeight) / 2), drawWidth, drawHeight);

    return await finishResize(file, canvas, w, h, quality);
  }

  const canvas = createCanvas();
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.imageSmoothingQuality = 'high';
  if (mode === 'fill' && maintainAspect) {
    const source = getCenteredCropRect(imgW(img), imgH(img), w / h);
    ctx.drawImage(img, source.x, source.y, source.width, source.height, 0, 0, w, h);
  } else {
    if (mode === 'fit' && options.exactCanvas && options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
  }

  return finishResize(file, canvas, w, h, quality);
}

async function finishResize(file, canvas, width, height, quality) {
  const ext = getFormatFromExtension(file.name);
  const format = getCanvasOutputFormat(ext);
  const q = format.lossless ? undefined : (quality != null ? quality : 0.92);
  const blob = await canvasToBlob(canvas, format.mime, q);

  return {
    blob,
    name: replaceExtension(file.name, format.ext),
    originalSize: file.size,
    newSize: blob.size,
    width,
    height,
  };
}

export async function applyAdjustments(file, adjustments) {
  validateImageFile(file);
  if (adjustments.gamma != null && (!Number.isFinite(adjustments.gamma) || adjustments.gamma <= 0)) {
    throw new Error('Gamma must be a positive number.');
  }
  if (
    !Number.isFinite(adjustments.temperature || 0) ||
    !Number.isFinite(adjustments.tint || 0)
  ) {
    throw new Error('Temperature and tint adjustments must be finite numbers.');
  }
  const { img } = await loadImage(file);
  const canvas = createCanvas();
  let width = imgW(img);
  let height = imgH(img);

  if (adjustments.rotate != null && ![0, 90, 180, 270].includes(adjustments.rotate)) {
    throw new Error('Rotation must be 0, 90, 180, or 270 degrees.');
  }
  if (adjustments.rotate && (adjustments.rotate === 90 || adjustments.rotate === 270)) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  if (adjustments.rotate) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((adjustments.rotate * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
  }

  if (adjustments.flipH) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  if (adjustments.flipV) {
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }

  const filters = [];
  if (adjustments.brightness != null && adjustments.brightness !== 100)
    filters.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast != null && adjustments.contrast !== 100)
    filters.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation != null && adjustments.saturation !== 100)
    filters.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.hue != null && adjustments.hue !== 0)
    filters.push(`hue-rotate(${adjustments.hue}deg)`);
  if (adjustments.exposure != null && adjustments.exposure !== 0)
    filters.push(`brightness(${Math.round(100 * (2 ** adjustments.exposure))}%)`);
  if (adjustments.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
  if (adjustments.grayscale) filters.push('grayscale(100%)');
  if (adjustments.sepia) filters.push('sepia(100%)');
  if (adjustments.invert || adjustments.negative) filters.push('invert(100%)');
  if (adjustments.vintage) filters.push('sepia(45%) contrast(90%) saturate(80%)');
  if (adjustments.blackAndWhite) filters.push('grayscale(100%) contrast(150%)');
  if (adjustments.gaussianBlur > 0) filters.push(`blur(${adjustments.gaussianBlur}px)`);
  if (filters.length > 0) {
    ctx.filter = filters.join(' ');
  }

  ctx.drawImage(img, 0, 0, width, height);
  ctx.filter = 'none';

  if (adjustments.temperature || adjustments.tint || adjustments.gamma) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const temperature = adjustments.temperature || 0;
    const tint = adjustments.tint || 0;
    const gamma = adjustments.gamma || 1;
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = adjustChannel(imageData.data[i], gamma, temperature, tint, 1);
      imageData.data[i + 1] = adjustChannel(imageData.data[i + 1], gamma, temperature, tint, 0);
      imageData.data[i + 2] = adjustChannel(imageData.data[i + 2], gamma, temperature, tint, -1);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (adjustments.pixelate) {
    const requestedPixelSize = Number(adjustments.pixelate);
    if (!Number.isFinite(requestedPixelSize) || requestedPixelSize <= 0) {
      throw new Error('Pixel size must be a positive number.');
    }
    const pixelSize = Math.max(2, Math.floor(requestedPixelSize));
    const pixelCanvas = createCanvas();
    pixelCanvas.width = Math.max(1, Math.ceil(canvas.width / pixelSize));
    pixelCanvas.height = Math.max(1, Math.ceil(canvas.height / pixelSize));
    const pixelContext = pixelCanvas.getContext('2d');
    if (!pixelContext) throw new Error('Canvas is unavailable in this browser.');
    pixelContext.drawImage(canvas, 0, 0, pixelCanvas.width, pixelCanvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pixelCanvas, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
  }

  if (adjustments.emboss || adjustments.edgeDetection) {
    applyConvolution(ctx, canvas.width, canvas.height, adjustments.emboss ? 'emboss' : 'edge');
  } else if (adjustments.cartoon) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.round(imageData.data[i] / 64) * 64;
      imageData.data[i + 1] = Math.round(imageData.data[i + 1] / 64) * 64;
      imageData.data[i + 2] = Math.round(imageData.data[i + 2] / 64) * 64;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (adjustments.sharpen) {
    const sharpenCanvas = createCanvas();
    sharpenCanvas.width = canvas.width;
    sharpenCanvas.height = canvas.height;
    const sctx = sharpenCanvas.getContext('2d');
    sctx.drawImage(canvas, 0, 0);
    sctx.globalCompositeOperation = 'overlay';
    sctx.drawImage(canvas, 0, 0, canvas.width * 0.5, canvas.height * 0.5, 0, 0, canvas.width, canvas.height);
    sctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sharpenCanvas, 0, 0);
  }

  const ext = adjustments.outputFormat || getFormatFromExtension(file.name);
  const format = getCanvasOutputFormat(ext);
  const q = format.lossless ? undefined : (adjustments.quality != null ? adjustments.quality : 0.92);

  if (format.ext === 'jpg') {
    const tmp = createCanvas();
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);
    const blob = await canvasToBlob(tmp, format.mime, q);
    return { blob, name: replaceExtension(file.name, format.ext), originalSize: file.size, newSize: blob.size, width: canvas.width, height: canvas.height };
  }

  const blob = await canvasToBlob(canvas, format.mime, q);
  return { blob, name: replaceExtension(file.name, format.ext), originalSize: file.size, newSize: blob.size, width: canvas.width, height: canvas.height };
}

function replaceExtension(name, extension) {
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.substring(0, dot) : name}.${extension}`;
}

function applyConvolution(context, width, height, type) {
  const source = context.getImageData(0, 0, width, height);
  const input = source.data;
  const output = new Uint8ClampedArray(input);
  const kernel = type === 'emboss'
    ? [-2, -1, 0, -1, 1, 1, 0, 1, 2]
    : [-1, -1, -1, -1, 8, -1, -1, -1, -1];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixel = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        let value = type === 'emboss' ? 128 : 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const neighbor = ((y + ky) * width + x + kx) * 4 + channel;
            value += input[neighbor] * kernel[(ky + 1) * 3 + kx + 1];
          }
        }
        output[pixel + channel] = Math.max(0, Math.min(255, value));
      }
    }
  }
  source.data.set(output);
  context.putImageData(source, 0, 0);
}

function adjustChannel(value, gamma, temperature, tint, channelDirection) {
  const gammaAdjusted = 255 * ((value / 255) ** (1 / gamma));
  const colorShift = temperature * channelDirection + tint * (channelDirection === 0 ? 1 : -0.5);
  return Math.max(0, Math.min(255, Math.round(gammaAdjusted + colorShift)));
}

export async function cropImage(file, crop) {
  validateImageFile(file);
  const { img } = await loadImage(file);
  if (crop.preset != null || crop.aspectRatio != null) {
    const presetCrop = getCropForPreset(
      imgW(img),
      imgH(img),
      crop.preset ?? crop.aspectRatio
    );
    crop = { ...presetCrop, ...crop };
  }
  if (
    !Number.isInteger(crop.x) ||
    !Number.isInteger(crop.y) ||
    !Number.isInteger(crop.width) ||
    !Number.isInteger(crop.height) ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width < 1 ||
    crop.height < 1 ||
    crop.x + crop.width > imgW(img) ||
    crop.y + crop.height > imgH(img)
  ) {
    throw new Error('Crop area must be a positive whole-pixel rectangle inside the image.');
  }
  const canvas = createCanvas();
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const ext = getFormatFromExtension(file.name);
  const format = getCanvasOutputFormat(ext);
  const q = format.lossless ? undefined : 0.92;

  const blob = await canvasToBlob(canvas, format.mime, q);
  return { blob, name: replaceExtension(file.name, format.ext), originalSize: file.size, newSize: blob.size, width: crop.width, height: crop.height };
}

export async function transformCanvas(file, options = {}) {
  validateImageFile(file);
  const { img } = await loadImage(file);
  const rotate = ((options.rotate || 0) % 360 + 360) % 360;
  if (rotate % 90 !== 0) throw new Error('Rotation must be 0, 90, 180, or 270 degrees.');
  const rotated = rotate === 90 || rotate === 270;
  const sourceWidth = rotated ? imgH(img) : imgW(img);
  const sourceHeight = rotated ? imgW(img) : imgH(img);
  const padding = Math.max(0, Math.floor(options.padding || 0));
  const effectPadding = Math.ceil(Math.max(Number(options.shadow) || 0, Number(options.glow) || 0) * 2);
  const outerPadding = padding + effectPadding;
  const contentWidth = Math.max(1, Math.round(options.width || sourceWidth));
  const contentHeight = Math.max(1, Math.round(options.height || sourceHeight));
  const width = Math.max(1, contentWidth + outerPadding * 2);
  const height = Math.max(1, contentHeight + outerPadding * 2);
  if (width * height > MAX_IMAGE_PIXELS) throw new Error('Output dimensions exceed the 100-megapixel limit.');
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, width, height);
  }
  const radius = Math.max(0, Math.min(Number(options.roundedCorners) || 0, Math.min(width, height) / 2));
  if (radius) {
    context.beginPath();
    context.roundRect(0, 0, width, height, radius);
    context.clip();
  }
  context.save();
  if (options.shadow || options.glow) {
    context.shadowColor = options.glow ? options.glowColor || '#ffffff' : options.shadowColor || '#000000';
    context.shadowBlur = Math.max(0, Number(options.shadow || options.glow) || 0);
    context.shadowOffsetX = options.shadow ? Number(options.shadowOffsetX) || 0 : 0;
    context.shadowOffsetY = options.shadow ? Number(options.shadowOffsetY) || 0 : 0;
  }
  context.translate(width / 2, height / 2);
  context.rotate((rotate * Math.PI) / 180);
  context.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
  let source = { x: 0, y: 0, width: imgW(img), height: imgH(img) };
  let drawWidth = contentWidth;
  let drawHeight = contentHeight;
  if (options.mode === 'fit') {
    const scale = Math.min(contentWidth / sourceWidth, contentHeight / sourceHeight);
    drawWidth = Math.round(sourceWidth * scale);
    drawHeight = Math.round(sourceHeight * scale);
  } else if (options.mode === 'fill') {
    source = getCenteredCropRect(imgW(img), imgH(img), contentWidth / contentHeight);
  }
  context.drawImage(
    img,
    source.x, source.y, source.width, source.height,
    -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
  );
  context.restore();

  if (options.reflection) {
    const reflected = createCanvas();
    reflected.width = canvas.width;
    reflected.height = canvas.height + Math.round(canvas.height * 0.3);
    const reflectedContext = reflected.getContext('2d');
    if (!reflectedContext) throw new Error('Canvas is unavailable in this browser.');
    reflectedContext.drawImage(canvas, 0, 0);
    reflectedContext.save();
    reflectedContext.globalAlpha = Math.min(1, Math.max(0, options.reflectionOpacity ?? 0.25));
    reflectedContext.translate(0, canvas.height * 2);
    reflectedContext.scale(1, -1);
    reflectedContext.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, Math.round(canvas.height * 0.3));
    reflectedContext.restore();
    const fade = reflectedContext.createLinearGradient(0, canvas.height, 0, reflected.height);
    fade.addColorStop(0, 'rgba(0,0,0,0.35)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    reflectedContext.fillStyle = fade;
    reflectedContext.fillRect(0, canvas.height, canvas.width, reflected.height - canvas.height);
    canvas.width = reflected.width;
    canvas.height = reflected.height;
    const resizedContext = canvas.getContext('2d');
    if (!resizedContext) throw new Error('Canvas is unavailable in this browser.');
    resizedContext.drawImage(reflected, 0, 0);
  }

  if (options.mosaic > 0) {
    const blockSize = Math.max(2, Math.floor(options.mosaic));
    const small = createCanvas();
    small.width = Math.max(1, Math.ceil(canvas.width / blockSize));
    small.height = Math.max(1, Math.ceil(canvas.height / blockSize));
    const smallContext = small.getContext('2d');
    if (!smallContext) throw new Error('Canvas is unavailable in this browser.');
    smallContext.drawImage(canvas, 0, 0, small.width, small.height);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(small, 0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
  }

  if (options.borderWidth > 0) {
    context.strokeStyle = options.borderColor || '#ffffff';
    context.lineWidth = options.borderWidth;
    context.strokeRect(options.borderWidth / 2, options.borderWidth / 2, width - options.borderWidth, height - options.borderWidth);
  }
  if (options.vignette) {
    const gradient = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${Math.max(0, Math.min(1, options.vignette / 100))})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  if (options.noise > 0) {
    const imageData = context.getImageData(0, 0, width, height);
    const amount = Math.min(100, options.noise);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() * 2 - 1) * amount;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    context.putImageData(imageData, 0, 0);
  }

  if (options.mockup === 'browser' || options.mockup === 'device') {
    const frame = options.mockup === 'browser' ? 42 : 24;
    const framed = createCanvas();
    framed.width = width + frame * 2;
    framed.height = height + frame * 2 + (options.mockup === 'browser' ? 32 : 0);
    const frameContext = framed.getContext('2d');
    if (!frameContext) throw new Error('Canvas is unavailable in this browser.');
    frameContext.fillStyle = options.frameColor || '#171923';
    frameContext.fillRect(0, 0, framed.width, framed.height);
    frameContext.drawImage(canvas, frame, frame + (options.mockup === 'browser' ? 32 : 0));
    if (options.mockup === 'browser') {
      frameContext.fillStyle = '#343746';
      frameContext.fillRect(0, 0, framed.width, 32);
    }
    return exportTransformed(file, framed, options.outputFormat, options.quality, options.mockup);
  }

  return exportTransformed(file, canvas, options.outputFormat, options.quality);
}

async function exportTransformed(file, canvas, outputFormat, quality, suffix = '') {
  const extension = outputFormat || getFormatFromExtension(file.name);
  const format = IMAGE_FORMATS[extension] || IMAGE_FORMATS.png;
  if (format.ext === 'jpg') {
    const flattened = createCanvas();
    flattened.width = canvas.width;
    flattened.height = canvas.height;
    const context = flattened.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, flattened.width, flattened.height);
    context.drawImage(canvas, 0, 0);
    canvas = flattened;
  }
  const blob = await canvasToBlob(canvas, format.mime, format.lossless ? undefined : quality ?? 0.92);
  const base = replaceExtension(file.name, format.ext);
  const name = suffix ? `${base.substring(0, base.lastIndexOf('.'))}-${suffix}.${format.ext}` : base;
  return { blob, name, originalSize: file.size, newSize: blob.size, width: canvas.width, height: canvas.height };
}

export async function createScreenshotMockup(file, options = {}) {
  return transformCanvas(file, {
    ...options,
    mockup: options.mockup || 'browser',
    backgroundColor: options.backgroundColor || '#e5e7eb',
    padding: options.padding ?? 24,
  });
}

/**
 * Draws a text or image watermark onto a canvas context. Shared by the live preview and the export,
 * so what you see is exactly what you get. `overlay` is the already-loaded watermark image (for type 'image').
 */
export function drawWatermark(ctx, canvasWidth, canvasHeight, watermark, overlay) {
  const opacity = watermark.opacity != null ? watermark.opacity / 100 : 0.5;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error('Watermark opacity must be between 0 and 100.');
  }
  ctx.save();
  ctx.globalAlpha = opacity;

  if (watermark.rotation) {
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((watermark.rotation * Math.PI) / 180);
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
  }

  if (watermark.type === 'text') {
    if (!watermark.text) {
      ctx.restore();
      return;
    }
    const requestedFontSize = watermark.fontSize || (canvasWidth / 10) * (watermark.scale || 1);
    if (!Number.isFinite(requestedFontSize) || requestedFontSize <= 0) {
      throw new Error('Watermark font size must be a positive number.');
    }
    const fontSize = Math.max(1, Math.round(requestedFontSize));
    ctx.font = `${watermark.fontWeight || 'bold'} ${fontSize}px ${watermark.fontFamily || 'Inter, sans-serif'}`;
    ctx.fillStyle = watermark.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const center = getPositionCoords(watermark.position, canvasWidth, canvasHeight, ctx.measureText(watermark.text).width, fontSize);
    ctx.fillText(watermark.text, center.x, center.y);
  } else if (watermark.type === 'image' && overlay) {
    const wmWidth = imgW(overlay) * (watermark.scale || 0.2);
    const wmHeight = imgH(overlay) * (watermark.scale || 0.2);
    const center = getPositionCoords(watermark.position, canvasWidth, canvasHeight, wmWidth, wmHeight);
    ctx.drawImage(overlay, center.x - wmWidth / 2, center.y - wmHeight / 2, wmWidth, wmHeight);
  }
  ctx.restore();
}

export async function applyWatermark(file, watermark) {
  validateImageFile(file);
  const { img } = await loadImage(file);
  const canvas = createCanvas();
  canvas.width = imgW(img);
  canvas.height = imgH(img);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.drawImage(img, 0, 0);

  const overlay = watermark.type === 'image' && watermark.imageSrc ? await loadDrawableFromSrc(watermark.imageSrc) : null;
  drawWatermark(ctx, canvas.width, canvas.height, watermark, overlay);

  const ext = getFormatFromExtension(file.name);
  const format = getCanvasOutputFormat(ext);
  const q = format.lossless ? undefined : (watermark.quality != null ? watermark.quality : 0.92);

  const blob = await canvasToBlob(canvas, format.mime, q);
  return { blob, name: replaceExtension(file.name, format.ext), originalSize: file.size, newSize: blob.size };
}

async function loadDrawableFromSrc(src) {
  if (!hasDOM()) {
    // Blob/object URLs are fetchable from a worker of the same origin.
    const blob = await (await fetch(src)).blob();
    return createImageBitmap(blob);
  }
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Failed to load the watermark image.'));
    image.src = src;
  });
  return image;
}

/**
 * Centre point for an element of size (elemW x elemH) at one of nine anchors, keeping a margin to the edge.
 * Used for text (centre-aligned) and images (drawn from centre - half size).
 */
export function getPositionCoords(position, canvasW, canvasH, elemW, elemH) {
  const pad = Math.max(16, Math.round(Math.min(canvasW, canvasH) * 0.03));
  const [vertical, horizontal] = position === 'center' ? ['center', 'center'] : String(position).split('-');
  const left = pad + elemW / 2;
  const right = canvasW - pad - elemW / 2;
  const top = pad + elemH / 2;
  const bottom = canvasH - pad - elemH / 2;
  const x = horizontal === 'left' ? left : horizontal === 'right' ? right : canvasW / 2;
  const y = vertical === 'top' ? top : vertical === 'bottom' ? bottom : canvasH / 2;
  return { x, y };
}

export async function getImageDimensions(file) {
  const { width, height } = await loadImage(file);
  return { width, height };
}

export async function compressToTargetSize(file, targetBytes, maxIterations = 8) {
  validateImageFile(file);
  if (!Number.isFinite(targetBytes) || targetBytes < 1) {
    throw new Error('Target size must be at least 1 byte.');
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new Error('Compression iterations must be a positive whole number.');
  }

  const { img, width, height } = await loadImage(file);
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(img, 0, 0);

  let outputCanvas = canvas;
  let bestBlob;
  let bestQuality = 0.1;
  for (let resizeAttempt = 0; resizeAttempt <= 12; resizeAttempt++) {
    let low = 0.1;
    let high = 1;
    bestBlob = await canvasToBlob(outputCanvas, 'image/jpeg', low);
    bestQuality = low;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const quality = (low + high) / 2;
      const blob = await canvasToBlob(outputCanvas, 'image/jpeg', quality);
      if (blob.size <= targetBytes) {
        bestBlob = blob;
        bestQuality = quality;
        low = quality;
      } else {
        high = quality;
      }
    }
    if (bestBlob.size <= targetBytes || outputCanvas.width === 1 && outputCanvas.height === 1 || resizeAttempt === 12) break;
    const reduced = createCanvas();
    reduced.width = Math.max(1, Math.floor(outputCanvas.width * 0.85));
    reduced.height = Math.max(1, Math.floor(outputCanvas.height * 0.85));
    const reducedContext = reduced.getContext('2d');
    if (!reducedContext) throw new Error('Canvas is unavailable in this browser.');
    reducedContext.fillStyle = '#ffffff';
    reducedContext.fillRect(0, 0, reduced.width, reduced.height);
    reducedContext.drawImage(outputCanvas, 0, 0, reduced.width, reduced.height);
    outputCanvas = reduced;
  }

  return {
    blob: bestBlob,
    name: `${file.name.replace(/\.[^.]+$/, '')}.jpg`,
    originalSize: file.size,
    newSize: bestBlob.size,
    width: outputCanvas.width,
    height: outputCanvas.height,
    quality: bestQuality,
    targetReached: bestBlob.size <= targetBytes,
  };
}
