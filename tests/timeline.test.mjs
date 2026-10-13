import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTimeline,
  strokeFraction,
  advance,
} from '../src/lib/timeline.ts';

test('a long brush path changes continuously while future strokes remain hidden', () => {
  const timeline = createTimeline([1000, 10, 300]);
  const first = timeline.spans[0];
  const midway = (first.start + first.end) / 2;
  assert.equal(strokeFraction(first, midway), 0.5);
  assert.equal(strokeFraction(timeline.spans[1], midway), 0);
  assert.equal(strokeFraction(first, first.end + 0.01), 1);
});
test('seeking backward restores earlier partial states and completion is exact', () => {
  const timeline = createTimeline([0, 400, 400]);
  for (const span of timeline.spans)
    assert.equal(strokeFraction(span, timeline.duration), 1);
  for (const span of timeline.spans) assert.equal(strokeFraction(span, 0), 0);
  assert.equal(strokeFraction(timeline.spans[1], timeline.spans[1].start), 0);
});
test('speed changes preserve the existing playhead and stop at the end', () => {
  assert.equal(advance(5, 1000, 2, 20), 7);
  assert.equal(advance(19, 5000, 4, 20), 20);
  assert.equal(advance(5, -1000, 1, 20), 5);
});
test('dense works have finite nonzero stroke durations and bounded playback', () => {
  const timeline = createTimeline(
    Array.from({ length: 1758 }, (_, i) => (i ? 100 : 0)),
  );
  assert.ok(timeline.duration <= 120.001);
  assert.ok(timeline.spans.every((span) => span.end > span.start));
  assert.throws(() => createTimeline([NaN]));
  assert.throws(() => createTimeline([-1]));
});
