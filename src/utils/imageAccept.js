/** File-picker `accept` string for every image type the app can read. */
export const IMAGE_ACCEPT = 'image/*,.tif,.tiff,.heic,.heif,.avif,.ico';

/** Format chips shown on drop areas (what you can drop in). */
export const IMAGE_FORMAT_CHIPS = ['JPG', 'PNG', 'WebP', 'HEIC', 'TIFF', 'AVIF', 'GIF', 'BMP'];

export const FORMAT_INFO = {
  png: { label: 'PNG', hint: 'Lossless, keeps transparency. Best for graphics and screenshots.' },
  jpg: { label: 'JPG', hint: 'Small files for photos. No transparency (fills white).' },
  webp: { label: 'WebP', hint: 'Modern format: smaller than JPG or PNG at similar quality.' },
  bmp: { label: 'BMP', hint: 'Uncompressed. Large files, maximum compatibility.' },
};
