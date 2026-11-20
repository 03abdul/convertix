import { textToPdf } from './pdfService';

export async function convertDocument(file, targetFormat, onProgress, options) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt' && targetFormat === 'pdf') {
    const text = await file.text();
    return textToPdf(text);
  }

  if (ext === 'pdf' && (targetFormat === 'png' || targetFormat === 'jpg')) {
    const { pdfToImages } = await import('./pdfService');
    return pdfToImages(file, targetFormat, onProgress, options);
  }

  if (ext === 'docx' && targetFormat === 'pdf') {
    return docxToPdf(file);
  }

  throw new Error(`Conversion from ${ext} to ${targetFormat} is not supported in-browser.`);
}

async function docxToPdf(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ['u => u'] });
  const { htmlToPdf } = await import('./htmlToPdf');
  return htmlToPdf(result.value);
}
