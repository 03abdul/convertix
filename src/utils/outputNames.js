export function applyOutputNames(results, pattern, operation) {
  const used = new Set();
  return results.map((result, index) => {
    const extension = result.name?.includes('.') ? result.name.split('.').pop() : '';
    const originalName = result.file?.name || result.name || `image-${index + 1}`;
    const baseName = originalName.replace(/\.[^.]+$/, '');
    let name = pattern
      .replaceAll('{name}', baseName)
      .replaceAll('{index}', String((result.outputIndex ?? index) + 1).padStart(3, '0'))
      .replaceAll('{operation}', operation)
      .replaceAll('{ext}', extension);
    name = name.trim() || `${baseName}-${index + 1}`;
    if (extension && !name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
      name = `${name}.${extension}`;
    }
    const dot = name.lastIndexOf('.');
    const uniqueBase = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let uniqueName = name;
    let suffix = 1;
    while (used.has(uniqueName.toLowerCase())) {
      uniqueName = `${uniqueBase} (${suffix++})${ext}`;
    }
    used.add(uniqueName.toLowerCase());
    return { ...result, name: uniqueName };
  });
}
