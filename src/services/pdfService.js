import { PDFDocument, degrees, StandardFonts } from 'pdf-lib';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { loadImage, canvasToBlob } from './imageService';
import { toWinAnsi } from '../utils/pdfText';

export async function mergePdfs(files, onProgress) {
  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const arrayBuffer = await files[i].arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
    if (onProgress) onProgress(i + 1, files.length);
  }
  const bytes = await merged.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function splitPdf(file, ranges) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const total = srcDoc.getPageCount();
  for (const range of ranges) {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 1 || range.end < range.start || range.end > total) {
      throw new Error(`Page range must be between 1 and ${total}, with the end page not before the start.`);
    }
  }
  const results = [];

  for (const range of ranges) {
    const newDoc = await PDFDocument.create();
    const start = range.start - 1;
    const end = Math.min(range.end, total);
    const indices = [];
    for (let i = start; i < end; i++) indices.push(i);
    const pages = await newDoc.copyPages(srcDoc, indices);
    pages.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save();
    results.push({
      blob: new Blob([bytes], { type: 'application/pdf' }),
      name: `pages_${range.start}-${end}.pdf`,
    });
  }
  return results;
}

/** Rotates every page, or only the zero-based `pageIndices` when given. */
export async function rotatePdf(file, angle, pageIndices) {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer);
  const pages = doc.getPages();
  const selected = pageIndices ? new Set(pageIndices) : null;
  if (selected && [...selected].some((index) => !Number.isInteger(index) || index < 0 || index >= pages.length)) {
    throw new Error(`Page numbers must be from 1 to ${pages.length}.`);
  }
  pages.forEach((page, index) => {
    if (selected && !selected.has(index)) return;
    const current = page.getRotation().angle || 0;
    page.setRotation(degrees((current + angle) % 360));
  });
  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function extractPages(file, pageIndices) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const newDoc = await PDFDocument.create();
  const total = srcDoc.getPageCount();
  const valid = [...new Set(pageIndices)];
  if (valid.length === 0 || valid.some((index) => !Number.isInteger(index) || index < 0 || index >= total)) {
    throw new Error(`Select at least one valid page number from 1 to ${total}.`);
  }
  const pages = await newDoc.copyPages(srcDoc, valid);
  pages.forEach((p) => newDoc.addPage(p));
  const bytes = await newDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

function assertValidIndices(indices, total, { unique = false } = {}) {
  const invalid = !Array.isArray(indices) || indices.some((i) => !Number.isInteger(i) || i < 0 || i >= total);
  if (invalid || (unique && new Set(indices).size !== indices.length)) {
    throw new Error(`Page numbers must be whole numbers from 1 to ${total}.`);
  }
}

export async function deletePages(file, pageIndicesToRemove) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const total = srcDoc.getPageCount();
  assertValidIndices(pageIndicesToRemove, total);
  const toRemove = new Set(pageIndicesToRemove);
  const keepIndices = [];
  for (let i = 0; i < total; i++) {
    if (!toRemove.has(i)) keepIndices.push(i);
  }
  if (keepIndices.length === 0) throw new Error('You cannot delete every page of a PDF.');
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, keepIndices);
  pages.forEach((p) => newDoc.addPage(p));
  const bytes = await newDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function reorderPages(file, newOrder) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);
  assertValidIndices(newOrder, srcDoc.getPageCount(), { unique: true });
  if (newOrder.length === 0) throw new Error('Select at least one page.');
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, newOrder);
  pages.forEach((p) => newDoc.addPage(p));
  const bytes = await newDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

/**
 * Compresses a PDF.
 *  - mode 'optimize' (default): drops metadata and re-packs objects. Text stays selectable, gains are modest.
 *  - mode 'rasterize': renders every page to a JPEG and rebuilds the PDF. Much smaller for scans and
 *    image-heavy files, but text is no longer selectable or searchable.
 * Never returns a file larger than the original.
 */
export async function compressPdf(file, options = {}, onProgress) {
  const { mode = 'optimize', quality = 0.7, scale = 1.5 } = options;
  const arrayBuffer = await file.arrayBuffer();
  const original = () => new Blob([arrayBuffer], { type: 'application/pdf' });

  if (mode === 'rasterize') {
    if (!(quality > 0 && quality <= 1) || !(scale > 0 && scale <= 4)) {
      throw new Error('Choose a JPEG quality between 1% and 100% and a resolution up to 4x.');
    }
    const pages = await pdfToImages(file, 'jpg', onProgress, { scale, quality });
    const doc = await PDFDocument.create();
    doc.setProducer('Convertix');
    for (const rendered of pages) {
      const image = await doc.embedJpg(await rendered.blob.arrayBuffer());
      // Rendered at `scale` x the page size in points, so divide it back out.
      const page = doc.addPage([rendered.width / scale, rendered.height / scale]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return bytes.length >= file.size ? original() : new Blob([bytes], { type: 'application/pdf' });
  }

  const doc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('');
  doc.setCreator('');
  const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
  return bytes.length >= file.size ? original() : new Blob([bytes], { type: 'application/pdf' });
}

async function embedImage(pdfDoc, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'png') return pdfDoc.embedPng(await file.arrayBuffer());
  if (ext === 'jpg' || ext === 'jpeg') return pdfDoc.embedJpg(await file.arrayBuffer());
  // WebP, BMP, GIF, AVIF, HEIC, TIFF...: rasterise via canvas and embed as PNG.
  const { img, width, height } = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0);
  const png = await canvasToBlob(canvas, 'image/png');
  return pdfDoc.embedPng(await png.arrayBuffer());
}

export const PAGE_SIZES = {
  a4: { label: 'A4', width: 595.28, height: 841.89 },
  letter: { label: 'US Letter', width: 612, height: 792 },
};

/**
 * Where to place an image on a PDF page.
 *  - pageSize 'fit' (default): the page takes the image's own size (no margin).
 *  - pageSize 'a4' | 'letter': fixed page; the image is scaled to fit inside the margins, centered.
 *    orientation 'auto' picks portrait or landscape to suit each image.
 */
export function computePageLayout(imageWidth, imageHeight, { pageSize = 'fit', orientation = 'auto', margin = 0 } = {}) {
  if (pageSize === 'fit' || !PAGE_SIZES[pageSize]) {
    return { pageWidth: imageWidth, pageHeight: imageHeight, x: 0, y: 0, width: imageWidth, height: imageHeight };
  }
  let { width: pageWidth, height: pageHeight } = PAGE_SIZES[pageSize];
  const landscape = orientation === 'landscape' || (orientation === 'auto' && imageWidth > imageHeight);
  if (landscape) [pageWidth, pageHeight] = [pageHeight, pageWidth];
  const maxWidth = Math.max(1, pageWidth - margin * 2);
  const maxHeight = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
}

export async function imagesToPdf(files, onProgress, layoutOptions = {}) {
  const pdfDoc = await PDFDocument.create();
  const failed = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const img = await embedImage(pdfDoc, files[i]);
      const layout = computePageLayout(img.width, img.height, layoutOptions);
      const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
      page.drawImage(img, { x: layout.x, y: layout.y, width: layout.width, height: layout.height });
    } catch {
      failed.push(files[i].name);
    }
    if (onProgress) onProgress(i + 1, files.length);
  }
  if (failed.length > 0) throw new Error(`Could not add: ${failed.join(', ')}. Remove them and try again.`);
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function textToPdf(rawText) {
  const text = toWinAnsi(rawText.replace(/\r\n?/g, '\n'));
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;

  const lines = text.split('\n');
  const wrappedLines = [];
  for (const line of lines) {
    if (line === '') {
      wrappedLines.push('');
      continue;
    }
    const words = line.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(test, fontSize);
      if (width > maxWidth && current) {
        wrappedLines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    wrappedLines.push(current);
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of wrappedLines) {
    if (y < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function getPdfPageCount(file) {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer);
  return doc.getPageCount();
}

export async function pdfToImages(file, format, onProgress, options = {}) {
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const results = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: options.scale || 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? undefined : (options.quality ?? 0.92);
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mime, quality);
    });

    results.push({
      blob,
      name: `page_${i}.${format}`,
      width: canvas.width,
      height: canvas.height,
    });
    if (onProgress) onProgress(i, pdf.numPages);
  }

  return results;
}
