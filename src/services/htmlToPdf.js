import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toWinAnsi } from '../utils/pdfText';

/*
 * Turns the HTML that mammoth produces for a .docx into a PDF with basic formatting:
 * headings, bold / italic / underline, links, bullet and numbered lists (nested), tables and images.
 *
 * Two stages so the parser can be tested without drawing anything:
 *   parseHtml(html)      -> blocks    (pure: DOM in, plain objects out)
 *   renderBlocks(blocks) -> Blob      (layout and drawing with pdf-lib)
 */

const ELEMENT = 1;
const TEXT = 3;
const INLINE_SKIP_IN_ITEMS = new Set(['UL', 'OL', 'TABLE']);
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR', 'SECTION', 'ARTICLE']);

/** Collects styled text runs (and any images) from an inline subtree. */
function collectInline(node, style, runs, images, { skipLists = false } = {}) {
  if (node.nodeType === TEXT) {
    if (node.textContent) runs.push({ text: node.textContent, ...style });
    return;
  }
  if (node.nodeType !== ELEMENT) return;
  const tag = node.tagName;
  if (skipLists && INLINE_SKIP_IN_ITEMS.has(tag)) return;
  if (tag === 'BR') {
    runs.push({ br: true });
    return;
  }
  if (tag === 'IMG') {
    images.push(node.getAttribute('src') || '');
    return;
  }
  const next = { ...style };
  if (tag === 'STRONG' || tag === 'B') next.bold = true;
  if (tag === 'EM' || tag === 'I') next.italic = true;
  if (tag === 'U') next.underline = true;
  if (tag === 'A' && node.getAttribute('href')) {
    next.link = true;
    next.underline = true;
  }
  node.childNodes.forEach((child) => collectInline(child, next, runs, images, { skipLists }));
}

const hasText = (runs) => runs.some((run) => run.br || (run.text && run.text.trim()));

function pushInlineBlocks(node, blocks, make, options) {
  const runs = [];
  const images = [];
  collectInline(node, {}, runs, images, options);
  if (hasText(runs)) blocks.push(make(runs));
  images.forEach((src) => blocks.push({ type: 'image', src }));
}

function parseList(listNode, depth, blocks) {
  const ordered = listNode.tagName === 'OL';
  let counter = Number(listNode.getAttribute('start')) || 1;
  listNode.childNodes.forEach((child) => {
    if (child.nodeType !== ELEMENT || child.tagName !== 'LI') return;
    const marker = ordered ? `${counter++}.` : '•';
    const runs = [];
    const images = [];
    collectInline(child, {}, runs, images, { skipLists: true });
    blocks.push({ type: 'list-item', depth, marker, runs: hasText(runs) ? runs : [{ text: ' ' }] });
    images.forEach((src) => blocks.push({ type: 'image', src }));
    child.childNodes.forEach((nested) => {
      if (nested.nodeType === ELEMENT && (nested.tagName === 'UL' || nested.tagName === 'OL')) {
        parseList(nested, depth + 1, blocks);
      }
    });
  });
}

function parseTable(tableNode) {
  const rows = [];
  tableNode.querySelectorAll('tr').forEach((tr) => {
    const cells = [];
    tr.childNodes.forEach((cell) => {
      if (cell.nodeType !== ELEMENT || (cell.tagName !== 'TD' && cell.tagName !== 'TH')) return;
      const runs = [];
      collectInline(cell, {}, runs, []);
      cells.push({ runs, header: cell.tagName === 'TH' });
    });
    if (cells.length > 0) rows.push(cells);
  });
  return rows;
}

function parseChildren(parent, blocks) {
  parent.childNodes.forEach((node) => {
    if (node.nodeType === TEXT) {
      if (node.textContent.trim()) blocks.push({ type: 'paragraph', runs: [{ text: node.textContent }] });
      return;
    }
    if (node.nodeType !== ELEMENT) return;
    const tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) {
      pushInlineBlocks(node, blocks, (runs) => ({ type: 'heading', level: Number(tag[1]), runs }));
    } else if (tag === 'UL' || tag === 'OL') {
      parseList(node, 0, blocks);
    } else if (tag === 'TABLE') {
      const rows = parseTable(node);
      if (rows.length > 0) blocks.push({ type: 'table', rows });
    } else if (tag === 'IMG') {
      blocks.push({ type: 'image', src: node.getAttribute('src') || '' });
    } else if ((tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'BLOCKQUOTE')
      && Array.from(node.children).some((child) => BLOCK_TAGS.has(child.tagName))) {
      parseChildren(node, blocks);
    } else {
      pushInlineBlocks(node, blocks, (runs) => ({ type: 'paragraph', runs }));
    }
  });
}

export function parseHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = [];
  parseChildren(doc.body, blocks);
  return blocks;
}

/* ---------------------------------- rendering ---------------------------------- */

const PAGE = { width: 595.28, height: 841.89, margin: 56 };
const BODY_SIZE = 11;
const HEADING_SIZES = { 1: 22, 2: 18, 3: 15, 4: 13, 5: 12, 6: 11 };
const COLORS = { text: rgb(0.1, 0.1, 0.1), link: rgb(0.1, 0.3, 0.8), border: rgb(0.72, 0.72, 0.72), headerFill: rgb(0.93, 0.93, 0.93) };

function decodeDataUri(src) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/is.exec(src);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime: match[1].toLowerCase(), bytes };
}

export async function renderBlocks(blocks) {
  const pdf = await PDFDocument.create();
  pdf.setProducer('Convertix');
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const fontFor = (run, forceBold) => {
    const bold = forceBold || run.bold;
    if (bold && run.italic) return fonts.boldItalic;
    if (bold) return fonts.bold;
    if (run.italic) return fonts.italic;
    return fonts.regular;
  };

  const contentWidth = PAGE.width - PAGE.margin * 2;
  const contentHeight = PAGE.height - PAGE.margin * 2;
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  };
  const ensure = (height) => {
    if (y - height < PAGE.margin && y < PAGE.height - PAGE.margin) newPage();
  };

  /** Word-wraps styled runs into lines of positioned items. */
  const layout = (runs, size, maxWidth, forceBold = false) => {
    const lines = [];
    let line = { items: [], width: 0 };
    const finish = () => {
      while (line.items.length && line.items[line.items.length - 1].space) line.width -= line.items.pop().width;
      lines.push(line);
      line = { items: [], width: 0 };
    };
    for (const run of runs) {
      if (run.br) { finish(); continue; }
      const font = fontFor(run, forceBold);
      const text = toWinAnsi(run.text.replace(/\u00A0/g, ' ')).replace(/\r?\n/g, ' ');
      for (const token of text.split(/( +)/)) {
        if (!token) continue;
        const isSpace = token[0] === ' ';
        const piece = isSpace ? ' ' : token;
        const width = font.widthOfTextAtSize(piece, size);
        if (isSpace) {
          if (line.items.length) { line.items.push({ text: ' ', width, font, space: true }); line.width += width; }
          continue;
        }
        if (line.width + width > maxWidth && line.items.some((item) => !item.space)) finish();
        if (width > maxWidth) {
          // A single token wider than the line (long URL): break it by characters.
          let chunk = '';
          for (const char of piece) {
            if (font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk) {
              line.items.push({ text: chunk, width: font.widthOfTextAtSize(chunk, size), font, run });
              line.width += font.widthOfTextAtSize(chunk, size);
              finish();
              chunk = '';
            }
            chunk += char;
          }
          if (chunk) {
            const chunkWidth = font.widthOfTextAtSize(chunk, size);
            line.items.push({ text: chunk, width: chunkWidth, font, run });
            line.width += chunkWidth;
          }
          continue;
        }
        line.items.push({ text: piece, width, font, run });
        line.width += width;
      }
    }
    if (line.items.length || lines.length === 0) finish();
    return lines;
  };

  const drawLine = (lineObj, x, baseline, size) => {
    let cursor = x;
    for (const item of lineObj.items) {
      const color = item.run?.link ? COLORS.link : COLORS.text;
      if (!item.space) {
        page.drawText(item.text, { x: cursor, y: baseline, size, font: item.font, color });
        if (item.run?.underline) {
          page.drawLine({ start: { x: cursor, y: baseline - 1.5 }, end: { x: cursor + item.width, y: baseline - 1.5 }, thickness: 0.6, color });
        }
      }
      cursor += item.width;
    }
  };

  const drawTextBlock = (runs, { size, x = PAGE.margin, width = contentWidth, bold = false, lineGap = 1.35, marker }) => {
    const lines = layout(runs, size, width, bold);
    const lineHeight = size * lineGap;
    lines.forEach((line, index) => {
      ensure(lineHeight);
      const baseline = y - size;
      if (index === 0 && marker) {
        const markerWidth = fonts.regular.widthOfTextAtSize(marker, size);
        page.drawText(marker, { x: x - markerWidth - 5, y: baseline, size, font: fonts.regular, color: COLORS.text });
      }
      drawLine(line, x, baseline, size);
      y -= lineHeight;
    });
  };

  const embedImage = async (src) => {
    const decoded = decodeDataUri(src);
    if (!decoded) return null;
    try {
      if (decoded.mime === 'image/png') return await pdf.embedPng(decoded.bytes);
      if (decoded.mime === 'image/jpeg' || decoded.mime === 'image/jpg') return await pdf.embedJpg(decoded.bytes);
    } catch {
      return null;
    }
    return null; // GIF, EMF, WMF... cannot be embedded directly
  };

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex];
    if (block.type === 'heading') {
      const size = HEADING_SIZES[block.level] || BODY_SIZE;
      if (y < PAGE.height - PAGE.margin) y -= size * 0.5;
      ensure(size * 1.35 + BODY_SIZE * 2.7); // keep a heading with at least two lines of what follows
      drawTextBlock(block.runs, { size, bold: true, lineGap: 1.25 });
      y -= size * 0.3;
    } else if (block.type === 'paragraph') {
      drawTextBlock(block.runs, { size: BODY_SIZE });
      y -= BODY_SIZE * 0.55;
    } else if (block.type === 'list-item') {
      const indent = 20 + block.depth * 18;
      drawTextBlock(block.runs, { size: BODY_SIZE, x: PAGE.margin + indent, width: contentWidth - indent, marker: block.marker });
      y -= BODY_SIZE * 0.2;
      if (blocks[blockIndex + 1]?.type !== 'list-item') y -= BODY_SIZE * 0.5; // gap after the last item
    } else if (block.type === 'image') {
      const image = await embedImage(block.src);
      if (!image) {
        drawTextBlock([{ text: '[Image not shown]', italic: true }], { size: BODY_SIZE - 1 });
        continue;
      }
      // Word stores pixels at 96 dpi; PDF points are 72 per inch.
      let width = image.width * 0.75;
      let height = image.height * 0.75;
      const scale = Math.min(1, contentWidth / width, contentHeight / height);
      width *= scale;
      height *= scale;
      ensure(height);
      page.drawImage(image, { x: PAGE.margin, y: y - height, width, height });
      y -= height + 8;
    } else if (block.type === 'table') {
      if (y < PAGE.height - PAGE.margin) y -= 4;
      const columns = Math.max(...block.rows.map((row) => row.length));
      const columnWidth = contentWidth / columns;
      const size = 10;
      const lineHeight = size * 1.3;
      const padding = 4;
      const maxLines = Math.max(1, Math.floor((contentHeight - padding * 2) / lineHeight));
      for (const row of block.rows) {
        const laidOut = row.map((cell) => layout(cell.runs, size, columnWidth - padding * 2, cell.header).slice(0, maxLines));
        const rowHeight = Math.max(...laidOut.map((lines) => lines.length)) * lineHeight + padding * 2;
        ensure(rowHeight);
        row.forEach((cell, index) => {
          const x = PAGE.margin + index * columnWidth;
          page.drawRectangle({
            x, y: y - rowHeight, width: columnWidth, height: rowHeight,
            borderWidth: 0.5, borderColor: COLORS.border, color: cell.header ? COLORS.headerFill : undefined,
          });
          laidOut[index].forEach((line, lineIndex) => {
            drawLine(line, x + padding, y - padding - size - lineIndex * lineHeight, size);
          });
        });
        y -= rowHeight;
      }
      y -= 10;
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function htmlToPdf(html) {
  return renderBlocks(parseHtml(html));
}
