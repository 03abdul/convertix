// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  compressPdf,
  computePageLayout,
  deletePages,
  extractPages,
  getPdfPageCount,
  imagesToPdf,
  reorderPages,
  rotatePdf,
  splitPdf,
  textToPdf,
} from './pdfService';

async function createPdf(pageCount = 2) {
  const document = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) document.addPage();
  return new File([await document.save()], 'fixture.pdf', { type: 'application/pdf' });
}

const asFile = (blob) => new File([blob], 'out.pdf', { type: 'application/pdf' });

describe('PDF page operations', () => {
  it('counts PDF pages and extracts requested pages', async () => {
    const file = await createPdf();
    expect(await getPdfPageCount(file)).toBe(2);
    const extracted = await extractPages(file, [1]);
    expect(await getPdfPageCount(asFile(extracted))).toBe(1);
  });

  it('rejects empty or invalid page selections', async () => {
    const file = await createPdf();
    await expect(extractPages(file, [])).rejects.toThrow('Select at least one valid page');
    await expect(extractPages(file, [2])).rejects.toThrow('Select at least one valid page');
    await expect(splitPdf(file, [{ start: 0, end: 1 }])).rejects.toThrow('Page range must be between');
  });

  it('deletes pages and refuses invalid or total deletion', async () => {
    const file = await createPdf(3);
    expect(await getPdfPageCount(asFile(await deletePages(file, [0])))).toBe(2);
    await expect(deletePages(file, [5])).rejects.toThrow('Page numbers must be');
    await expect(deletePages(file, [0, 1, 2])).rejects.toThrow('cannot delete every page');
  });

  it('reorders pages and rejects duplicates or out-of-range indices', async () => {
    const file = await createPdf(3);
    expect(await getPdfPageCount(asFile(await reorderPages(file, [2, 0, 1])))).toBe(3);
    await expect(reorderPages(file, [0, 0])).rejects.toThrow('Page numbers must be');
    await expect(reorderPages(file, [3])).rejects.toThrow('Page numbers must be');
    await expect(reorderPages(file, [])).rejects.toThrow('Select at least one page');
  });
});

describe('compressPdf', () => {
  it('never returns a file larger than the original', async () => {
    const file = await createPdf(3);
    const result = await compressPdf(file);
    expect(result.size).toBeLessThanOrEqual(file.size);
    expect(await getPdfPageCount(asFile(result))).toBe(3);
  });
});

describe('textToPdf', () => {
  it('does not throw on characters outside WinAnsi and wraps long text across pages', async () => {
    const text = `Привет 日本語 “quoted”\t${'word '.repeat(4000)}`;
    const blob = await textToPdf(text);
    expect(await getPdfPageCount(asFile(blob))).toBeGreaterThan(1);
  });
});

describe('imagesToPdf', () => {
  it('reports files that cannot be embedded instead of skipping them silently', async () => {
    const bad = new File(['not a png'], 'broken.png', { type: 'image/png' });
    await expect(imagesToPdf([bad])).rejects.toThrow('broken.png');
  });
});

describe('computePageLayout', () => {
  it('uses the image size when fitting the page to the image', () => {
    expect(computePageLayout(300, 200)).toEqual({ pageWidth: 300, pageHeight: 200, x: 0, y: 0, width: 300, height: 200 });
  });

  it('centers and scales an image inside an A4 page with margins', () => {
    const layout = computePageLayout(1000, 2000, { pageSize: 'a4', margin: 36 });
    expect([layout.pageWidth, layout.pageHeight]).toEqual([595.28, 841.89]);
    expect(layout.height).toBeLessThanOrEqual(841.89 - 72);
    expect(layout.width / layout.height).toBeCloseTo(0.5);
    expect(layout.x).toBeCloseTo((595.28 - layout.width) / 2);
  });

  it('switches to landscape automatically for wide images', () => {
    const layout = computePageLayout(2000, 1000, { pageSize: 'letter', orientation: 'auto' });
    expect([layout.pageWidth, layout.pageHeight]).toEqual([792, 612]);
    expect(computePageLayout(2000, 1000, { pageSize: 'letter', orientation: 'portrait' }).pageWidth).toBe(612);
  });
});

describe('rotatePdf', () => {
  it('rotates only the selected pages', async () => {
    const file = await createPdf(3);
    const rotated = await PDFDocument.load(await (await rotatePdf(file, 90, [1])).arrayBuffer());
    expect(rotated.getPages().map((page) => page.getRotation().angle)).toEqual([0, 90, 0]);
    await expect(rotatePdf(file, 90, [5])).rejects.toThrow('Page numbers must be from 1 to 3');
  });
});
