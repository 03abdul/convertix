// Numeric EXIF tag ids (as exposed by piexifjs), so this module has no dependencies.
const TAG = {
  make: 271,
  model: 272,
  software: 305,
  dateTimeOriginal: 36867,
  exposureTime: 33434,
  fNumber: 33437,
  iso: 34855,
  focalLength: 37386,
  lensModel: 42036,
};

const rational = (value) => (Array.isArray(value) && value.length === 2 && value[1] !== 0 ? value[0] / value[1] : null);
const clean = (value) => (typeof value === 'string' ? value.replace(/\0/g, '').trim() : value);

function formatExposure(value) {
  const seconds = rational(value);
  if (seconds == null) return null;
  return seconds >= 1 ? `${seconds}s` : `1/${Math.round(1 / seconds)}s`;
}

/**
 * Turns piexif's raw EXIF object into a short, human summary and a privacy signal.
 * Returns { fields: [[label, value]...], hasLocation, hasCameraInfo }.
 */
export function summarizeExif(exif) {
  if (!exif) return { fields: [], hasLocation: false, hasCameraInfo: false };
  const base = exif['0th'] || {};
  const detail = exif.Exif || {};
  const gps = exif.GPS || {};

  const camera = [clean(base[TAG.make]), clean(base[TAG.model])].filter(Boolean).join(' ');
  const fNumber = rational(detail[TAG.fNumber]);
  const focal = rational(detail[TAG.focalLength]);
  const taken = clean(detail[TAG.dateTimeOriginal]);

  const fields = [
    ['Camera', camera || null],
    ['Lens', clean(detail[TAG.lensModel]) || null],
    ['Taken', taken ? taken.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3') : null],
    ['Exposure', formatExposure(detail[TAG.exposureTime])],
    ['Aperture', fNumber ? `f/${fNumber.toFixed(1)}` : null],
    ['ISO', detail[TAG.iso] != null ? String(Array.isArray(detail[TAG.iso]) ? detail[TAG.iso][0] : detail[TAG.iso]) : null],
    ['Focal length', focal ? `${Math.round(focal)} mm` : null],
    ['Software', clean(base[TAG.software]) || null],
  ].filter(([, value]) => value);

  return {
    fields,
    hasLocation: Object.keys(gps).length > 0,
    hasCameraInfo: Boolean(camera),
  };
}
