async function readPack(path, signal) {
  const script = document.createElement('script');
  return new Promise((resolve, reject) => {
    function finish(error) {
      signal.removeEventListener('abort', cancel);
      const payload = script.textContent;
      script.remove();
      script.onload = script.onerror = null;
      if (error) reject(error);
      else resolve(payload);
    }
    const cancel = () =>
      finish(new DOMException('Drawing cancelled', 'AbortError'));
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener('abort', cancel, { once: true });
    script.onload = () => finish();
    script.onerror = () =>
      finish(Error('The drawings folder could not be read.'));
    script.src = path;
    document.head.append(script);
  });
}
export async function loadDrawingSource(work, signal) {
  if (work.drawingFile) {
    const packed = await readPack(work.drawingFile, signal);
    const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
    return new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).text();
  }
  const res = await fetch(work.svg, { signal });
  if (!res.ok) throw Error('Drawing unavailable');
  return res.text();
}
