// Standard PDF fonts (Helvetica etc.) only cover WinAnsi: Latin-1 plus a few punctuation marks in
// the 0x80-0x9F range. Anything else would make pdf-lib throw, so replace it with "?".
const UNSUPPORTED = /[^\x20-\x7E\xA0-\xFF\n€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;

export function toWinAnsi(text) {
  return text.replace(/\t/g, '    ').replace(UNSUPPORTED, '?');
}
