// Published image keys by work id. Shared by the build-time catalog and the
// screen saver's client script, so the two never drift apart.
export const rasterWidths = [320, 640, 1200, 1600, 2000];
export const abstractWidths = [640, 1200, 2000];
export const rasterKey = (inkId: string, width: number) =>
  `/raster/${inkId}-${width}.webp`;
export const abstractKey = (id: string, width: number) =>
  `/abstract/images/${id}-${width}.webp`;
