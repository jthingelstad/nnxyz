// The collection drawn as one building, in isometric projection with its
// floors stacked the way a museum map shows them. Ground floor: the entrance
// hall, Abstract, Other nnxyz and Scrimshaw. Second floor: Faces and
// Rawblocks. Third floor: the three dated parts of New Nifty on the Block.
// Room areas follow the number of works, consecutive rooms share a doorway,
// and each wing or part opens off the corridor.
import {
  wings,
  roomWorks,
  exhibitionPath,
  wingPath,
  type Room,
} from './exhibitions';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface PlanRoom extends Rect {
  id: string;
  title: string;
  count: number;
  href: string;
  wingId: string;
  shade: number;
  isCoda: boolean;
}
export interface Plate extends Rect {
  wingId: string;
  title: string;
  href: string | null;
  part: boolean;
}
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thick?: boolean;
}
export interface Floor {
  number: number;
  label: string;
  footprint: Rect;
  corridor: Rect;
  rooms: PlanRoom[];
  plates: Plate[];
  walls: Segment[];
  doors: Segment[];
  stairs: { x: number; y: number };
  entrance: { x: number; y: number } | null;
  /** Screen position of the plan origin for this floor. */
  origin: { x: number; y: number };
}

export const WING_COLORS: Record<string, string> = {
  'nifty-faces': '#e3a93a',
  nnotb: '#3f8fb5',
  rawblocks: '#d2603e',
  abstract: '#c45c93',
  'nnxyz-other': '#5b9c5a',
  scrimshaw: '#7b6fc4',
  'after-nifty-ink': '#8a7a52',
};
export const PLAN_W = 900;
export const PLAN_H = 420;
const CORRIDOR = 80;
const PLATE = 22;
const DOOR = 28;
export const SLAB = 24;
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const FLOOR_GAP = 520;
export const LEGEND_W = 300;
export const WIDTH = 1720;
export const HEIGHT = 60 + FLOOR_GAP * 2 + (PLAN_W + PLAN_H) * SIN + SLAB + 110;

const count = (room: Room) => roomWorks(room).length;
const wing = (id: string) => wings.find((w) => w.id === id)!;
const total = (rooms: Room[]) => rooms.reduce((n, r) => n + count(r), 0);

/** Project plan coordinates to the screen for a floor. */
export const project = (floor: Floor, x: number, y: number) => ({
  x: floor.origin.x + (x - y) * COS,
  y: floor.origin.y + (x + y) * SIN,
});

/** Rows of rooms laid from the corridor upward, snaking so each touches the next. */
function layRooms(rooms: Room[], box: Rect, rows: number[]): PlanRoom[] {
  const placed: PlanRoom[] = [];
  const rowHeight = box.h / rows.length;
  let index = 0;
  rows.forEach((n, r) => {
    const slice = rooms.slice(index, index + n);
    index += n;
    const weights = slice.map((room) => Math.max(count(room), 9));
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = box.x;
    const row = slice.map((room, i) => {
      const w = (box.w * weights[i]) / sum;
      const plan: PlanRoom = {
        id: room.id,
        title: room.title,
        count: count(room),
        href: exhibitionPath(room.id),
        x,
        y: box.y + box.h - (r + 1) * rowHeight,
        w,
        h: rowHeight,
        wingId: room.wingId,
        shade: 0,
        isCoda: room.isCoda,
      };
      x += w;
      return plan;
    });
    if (r % 2 === 1) {
      let rx = box.x;
      for (const plan of [...row].reverse()) {
        plan.x = rx;
        rx += plan.w;
      }
    }
    placed.push(...row);
  });
  placed.forEach((plan, i) => (plan.shade = i % 3));
  return placed;
}

function sharedDoor(a: Rect, b: Rect): Segment | null {
  const eps = 0.5;
  if (Math.abs(a.x + a.w - b.x) < eps || Math.abs(b.x + b.w - a.x) < eps) {
    const x = Math.abs(a.x + a.w - b.x) < eps ? a.x + a.w : a.x;
    const top = Math.max(a.y, b.y);
    const bottom = Math.min(a.y + a.h, b.y + b.h);
    if (bottom - top < DOOR) return null;
    const mid = (top + bottom) / 2;
    return { x1: x, y1: mid - DOOR / 2, x2: x, y2: mid + DOOR / 2 };
  }
  if (Math.abs(a.y + a.h - b.y) < eps || Math.abs(b.y + b.h - a.y) < eps) {
    const y = Math.abs(a.y + a.h - b.y) < eps ? a.y + a.h : a.y;
    const left = Math.max(a.x, b.x);
    const right = Math.min(a.x + a.w, b.x + b.w);
    if (right - left < DOOR) return null;
    const mid = (left + right) / 2;
    return { x1: mid - DOOR / 2, y1: y, x2: mid + DOOR / 2, y2: y };
  }
  return null;
}

interface Block {
  wingId: string;
  title: string;
  href: string | null;
  part: boolean;
  rooms: Room[];
  box: Rect;
  rows: number[];
}

function buildFloor(
  number: number,
  label: string,
  blocks: Block[],
  entrance: boolean,
): Floor {
  const footprint = { x: 0, y: 0, w: PLAN_W, h: PLAN_H };
  const corridor = { x: 0, y: PLAN_H - CORRIDOR, w: PLAN_W, h: CORRIDOR };
  const rooms: PlanRoom[] = [];
  const plates: Plate[] = [];
  const doors: Segment[] = [];
  for (const block of blocks) {
    const inner = {
      x: block.box.x,
      y: block.box.y + PLATE,
      w: block.box.w,
      h: block.box.h - PLATE,
    };
    const laid = layRooms(block.rooms, inner, block.rows);
    plates.push({
      wingId: block.wingId,
      title: block.title,
      href: block.href,
      part: block.part,
      x: block.box.x,
      y: block.box.y,
      w: block.box.w,
      h: PLATE,
    });
    laid.forEach((room, i) => {
      const door =
        i > 0 ? sharedDoor(laid[i - 1], room) : sharedDoor(room, corridor);
      if (door) doors.push(door);
    });
    rooms.push(...laid);
  }
  const walls: Segment[] = [];
  for (const room of rooms)
    walls.push(
      { x1: room.x, y1: room.y, x2: room.x + room.w, y2: room.y },
      {
        x1: room.x + room.w,
        y1: room.y,
        x2: room.x + room.w,
        y2: room.y + room.h,
      },
      {
        x1: room.x,
        y1: room.y + room.h,
        x2: room.x + room.w,
        y2: room.y + room.h,
      },
      { x1: room.x, y1: room.y, x2: room.x, y2: room.y + room.h },
    );
  walls.push(
    { x1: 0, y1: 0, x2: PLAN_W, y2: 0, thick: true },
    { x1: PLAN_W, y1: 0, x2: PLAN_W, y2: PLAN_H, thick: true },
    { x1: 0, y1: PLAN_H, x2: PLAN_W, y2: PLAN_H, thick: true },
    { x1: 0, y1: 0, x2: 0, y2: PLAN_H, thick: true },
    { x1: 0, y1: corridor.y, x2: PLAN_W, y2: corridor.y },
  );
  const stairs = { x: PLAN_W - 70, y: corridor.y + CORRIDOR / 2 };
  const entranceDoor = { x: PLAN_W / 2, y: PLAN_H };
  if (entrance)
    doors.push({
      x1: entranceDoor.x - DOOR,
      y1: PLAN_H,
      x2: entranceDoor.x + DOOR,
      y2: PLAN_H,
    });
  // Floors stack from the ground up; each is drawn a little to the right of
  // the one below, as on a printed museum map.
  const index = number - 1;
  const origin = {
    x: LEGEND_W + PLAN_H * COS + 40 + index * 30,
    y: 60 + FLOOR_GAP * (2 - index),
  };
  return {
    number,
    label,
    footprint,
    corridor,
    rooms,
    plates,
    walls,
    doors,
    stairs,
    entrance: entrance ? entranceDoor : null,
    origin,
  };
}

function splitWidths(counts: number[], width: number): number[] {
  const sum = counts.reduce((a, b) => a + b, 0);
  const widths = counts.map((c) => Math.round((width * c) / sum));
  widths[widths.length - 1] += width - widths.reduce((a, b) => a + b, 0);
  return widths;
}
const roomsBox = { y: 0, h: PLAN_H - CORRIDOR };
function wingBlock(id: string, x: number, w: number, rows: number[]): Block {
  const data = wing(id);
  return {
    wingId: id,
    title: `${data.title} · ${total(data.rooms)} works`,
    href: wingPath(id),
    part: false,
    rooms: data.rooms,
    box: { x, w, ...roomsBox },
    rows,
  };
}

// Ground floor.
const groundIds = [
  'abstract',
  'nnxyz-other',
  'scrimshaw',
  ...(wings.some((w) => w.id === 'after-nifty-ink') ? ['after-nifty-ink'] : []),
];
const groundWidths = splitWidths(
  groundIds.map((id) => total(wing(id).rooms)),
  PLAN_W,
);
let gx = 0;
const groundBlocks = groundIds.map((id, i) => {
  const block = wingBlock(id, gx, groundWidths[i], [wing(id).rooms.length]);
  gx += groundWidths[i];
  return block;
});
// Second floor.
const [facesW, rawW] = splitWidths(
  [total(wing('nifty-faces').rooms), total(wing('rawblocks').rooms)],
  PLAN_W,
);
const secondBlocks = [
  wingBlock('nifty-faces', 0, facesW, [3, 3]),
  wingBlock('rawblocks', facesW, rawW, [2, 2]),
];
// Third floor: the parts of New Nifty on the Block side by side.
const nnotb = wing('nnotb');
const partWidths = splitWidths(
  nnotb.parts.map((part) => total(part.rooms)),
  PLAN_W,
);
let px = 0;
const thirdBlocks = nnotb.parts.map((part, i) => {
  const block: Block = {
    wingId: 'nnotb',
    title: `Part ${i + 1} · ${part.title}`,
    href: null,
    part: true,
    rooms: part.rooms,
    box: { x: px, w: partWidths[i], ...roomsBox },
    rows:
      part.rooms.length > 4
        ? [3, 3]
        : part.rooms.length === 4
          ? [2, 2]
          : [1, 1, 1],
  };
  px += partWidths[i];
  return block;
});

export const floors: Floor[] = [
  buildFloor(
    1,
    groundIds.length > 3
      ? 'Entrance, Abstract, Other nnxyz, Scrimshaw and After Nifty Ink'
      : 'Entrance, Abstract, Other nnxyz and Scrimshaw',
    groundBlocks,
    true,
  ),
  buildFloor(2, 'Faces and Rawblocks', secondBlocks, false),
  buildFloor(3, 'New Nifty on the Block', thirdBlocks, false),
];
export const legend = [
  { id: 'nifty-faces', floor: 2 },
  { id: 'nnotb', floor: 3 },
  { id: 'rawblocks', floor: 2 },
  { id: 'abstract', floor: 1 },
  { id: 'nnxyz-other', floor: 1 },
  { id: 'scrimshaw', floor: 1 },
  ...(wings.some((w) => w.id === 'after-nifty-ink')
    ? [{ id: 'after-nifty-ink', floor: 1 }]
    : []),
].map(({ id, floor }) => {
  const data = wing(id);
  return {
    id,
    floor,
    title: data.title,
    href: wingPath(id),
    rooms: data.rooms.length,
    count: total(data.rooms),
    representative: roomWorks(data.rooms[0])[0].artworkId,
  };
});

/** Wrap a title into lines that fit a room at the plan's label size. */
export function wrap(text: string, width: number, charWidth = 6.6): string[] {
  if (width < 96 && text.startsWith('Coda')) return ['Coda'];
  const max = Math.max(6, Math.floor((width - 18) / charWidth));
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}
