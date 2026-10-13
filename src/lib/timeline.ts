export interface StrokeSpan {
  start: number;
  end: number;
  length: number;
}
export interface Timeline {
  spans: StrokeSpan[];
  duration: number;
}
export function createTimeline(lengths: number[]): Timeline {
  if (!lengths.length || lengths.some((n) => !Number.isFinite(n) || n < 0))
    throw new Error('Invalid stroke lengths');
  const weights = lengths.map((length) => Math.max(4, length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const duration = Math.max(
    lengths.length * 0.057,
    Math.min(120, Math.max(20, totalWeight / 600)),
  );
  const variable = duration - lengths.length * 0.057;
  let cursor = 0;
  const spans = lengths.map((length, i) => {
    const start = cursor;
    const end = start + 0.045 + (variable * weights[i]) / totalWeight;
    cursor = end + 0.012;
    return { start, end, length };
  });
  return { spans, duration: cursor };
}
export function strokeFraction(span: StrokeSpan, time: number): number {
  return Math.max(
    0,
    Math.min(1, (time - span.start) / (span.end - span.start)),
  );
}
export function advance(
  time: number,
  elapsedMs: number,
  speed: number,
  duration: number,
): number {
  return Math.min(duration, time + (Math.max(0, elapsedMs) / 1000) * speed);
}
