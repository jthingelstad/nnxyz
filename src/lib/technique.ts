// How nnxyz drew: the stroke measures (curation/analysis/strokes/, method
// strokes-v1) and the twelve works shown at five points in their build. The
// numbers come from the saved analysis; nothing here is computed at build
// time from the drawings themselves.
import summary from '../../curation/analysis/strokes/summary.json';
import measuresFile from '../../curation/analysis/strokes/measures.json';
import technique from '../../curation/analysis/strokes/technique.json';

export interface WorkMeasures {
  artworkId: string;
  title: string;
  collectionId: string;
  recordedAt: string;
  strokes: number;
  recordedStrokes: number;
  helperStrokes: number;
  points: number;
  dots: number;
  translucentStrokes: number;
  distinctColors: number;
  finalCoverage: number;
  overpaintMean: number;
  buriedStrokes: number;
  ground: { rgb: number[]; alpha: number; dark: boolean } | null;
  deciles: {
    coverage: number[];
    widthMedian: number[];
    paletteSize: number[];
    overpaintMean: number[];
  };
}
export interface TechniqueWork {
  artworkId: string;
  title: string;
  pairWith?: string;
  why: string;
  reading: string;
}

const list = (
  Array.isArray(measuresFile)
    ? measuresFile
    : (measuresFile as { works: WorkMeasures[] }).works
) as WorkMeasures[];
export const measures = new Map(list.map((m) => [m.artworkId, m]));
export const strokeSummary = summary;
export const techniqueFrames: number[] = technique.frames;
export const techniqueWorks: TechniqueWork[] = technique.works;
export const techniqueMethod: string = technique.method;
/** Works with a build strip on their artwork page, by id. */
export const techniqueById = new Map(
  techniqueWorks.flatMap((work) => [
    [work.artworkId, work] as const,
    ...(work.pairWith ? [[work.pairWith, work] as const] : []),
  ]),
);
export const techniquePath = '/technique/';
export const percent = (x: number) => `${Math.round(x * 100)}%`;
