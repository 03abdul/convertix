import JSZip from 'jszip';

export async function createZip(files, onProgress) {
  const zip = new JSZip();
  const names = new Set();
  for (const file of files) {
    let name = file.name;
    if (names.has(name)) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.substring(0, dot) : name;
      const ext = dot > 0 ? name.substring(dot) : '';
      let i = 1;
      while (names.has(`${base} (${i})${ext}`)) i++;
      name = `${base} (${i})${ext}`;
    }
    names.add(name);
    zip.file(name, file.data || file);
  }
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => {
      if (onProgress) onProgress(meta.percent);
    }
  );
  return blob;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
