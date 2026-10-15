import fs from 'node:fs';
// The October 14 exhibition map (curation/exhibitions/map.json and
// curation/abstract/exhibitions.json) is preserved as a record. Its gallery
// pages were published briefly; each address now leads to its wing.
const wingPath = {
  'nifty-faces': '/collections/nifty-faces/',
  nnotb: '/collections/nnotb/',
  rawblocks: '/collections/rawblocks/',
  abstract: '/collections/abstract/',
  'nnxyz-other': '/collections/other-related/#nnxyz-other',
  scrimshaw: '/collections/other-related/#scrimshaw',
};
export function retiredGalleryIds() {
  return [
    'curation/exhibitions/map.json',
    'curation/abstract/exhibitions.json',
  ].flatMap((file) =>
    JSON.parse(fs.readFileSync(file, 'utf8')).collections.flatMap((c) =>
      c.galleries.map((g) => ({ id: g.id, collectionId: c.id })),
    ),
  );
}
export function retiredGalleryRedirects() {
  return Object.fromEntries(
    retiredGalleryIds().map(({ id, collectionId }) => [
      `/galleries/${id}/`,
      wingPath[collectionId],
    ]),
  );
}
