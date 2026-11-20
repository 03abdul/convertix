// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { htmlToPdf, parseHtml } from './htmlToPdf';

// 1x1 red PNG
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const pageCount = async (blob) => (await PDFDocument.load(await blob.arrayBuffer())).getPageCount();

describe('parseHtml', () => {
  it('keeps heading levels and inline bold / italic / underline / link styling', () => {
    const blocks = parseHtml('<h2>Title</h2><p>Plain <strong>bold <em>both</em></strong> <u>under</u> <a href="https://x.test">link</a></p>');
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 2 });
    const runs = blocks[1].runs;
    expect(runs.find((run) => run.text === 'bold ')).toMatchObject({ bold: true });
    expect(runs.find((run) => run.text === 'both')).toMatchObject({ bold: true, italic: true });
    expect(runs.find((run) => run.text === 'under')).toMatchObject({ underline: true });
    expect(runs.find((run) => run.text === 'link')).toMatchObject({ link: true, underline: true });
  });

  it('flattens bullet and numbered lists, including nesting', () => {
    const blocks = parseHtml('<ol start="3"><li>three<ul><li>nested</li></ul></li><li>four</li></ol>');
    expect(blocks.map((block) => [block.type, block.depth, block.marker])).toEqual([
      ['list-item', 0, '3.'],
      ['list-item', 1, '•'],
      ['list-item', 0, '4.'],
    ]);
  });

  it('extracts tables with header cells, and images as their own blocks', () => {
    const blocks = parseHtml(`<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><p><img src="data:image/png;base64,${PNG}"/></p>`);
    expect(blocks[0].type).toBe('table');
    expect(blocks[0].rows[0].every((cell) => cell.header)).toBe(true);
    expect(blocks[0].rows[1][0].runs[0].text).toBe('1');
    expect(blocks[1]).toMatchObject({ type: 'image' });
  });

  it('ignores empty paragraphs', () => {
    expect(parseHtml('<p> </p><p></p>')).toEqual([]);
  });
});

describe('htmlToPdf', () => {
  it('renders a mixed document without throwing, including unsupported characters', async () => {
    const html = `
      <h1>Report ✓ 日本語</h1>
      <p>Hello <strong>bold</strong> and <em>italic</em> text, plus “smart quotes” – and a bullet •.</p>
      <ul><li>First</li><li>Second<ul><li>Nested</li></ul></li></ul>
      <table><tr><th>Name</th><th>Qty</th></tr><tr><td>Apples</td><td>3</td></tr></table>
      <p><img src="data:image/png;base64,${PNG}"/></p>
      <p><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="/></p>`;
    const blob = await htmlToPdf(html);
    expect(blob.type).toBe('application/pdf');
    expect(await pageCount(blob)).toBe(1);
  });

  it('paginates long content and breaks very long unbroken words', async () => {
    const html = `<p>${'lorem ipsum dolor sit amet '.repeat(900)}</p><p>${'x'.repeat(400)}</p>`;
    expect(await pageCount(await htmlToPdf(html))).toBeGreaterThan(1);
  });

  it('produces a valid one-page PDF for an empty document', async () => {
    expect(await pageCount(await htmlToPdf(''))).toBe(1);
  });
});
