import type { APIRoute } from 'astro';
import { museum } from '../../visit/catalog';

// Serve the visit data separately so the room directory can render before the
// catalog and the 3D view are ready.
export const GET: APIRoute = () => Response.json({ floors: museum });
