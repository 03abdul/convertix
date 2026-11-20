import { useEffect, useState } from 'react';
import { getSupportedOutputFormats } from '@/services/imageService';

const ALL_FORMATS = ['png', 'jpg', 'webp', 'bmp'];

/** Output formats this browser can encode. Starts optimistic, then narrows after a quick probe. */
export function useSupportedFormats() {
  const [formats, setFormats] = useState(ALL_FORMATS);
  useEffect(() => {
    let active = true;
    getSupportedOutputFormats().then((supported) => {
      if (active) setFormats(supported);
    });
    return () => {
      active = false;
    };
  }, []);
  return formats;
}

/** Falls back to a format that is supported when the preferred one is not. */
export function pickSupportedFormat(preferred, supported) {
  if (supported.includes(preferred)) return preferred;
  return supported.includes('jpg') ? 'jpg' : supported[0];
}
