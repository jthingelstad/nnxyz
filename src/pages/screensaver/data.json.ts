import type { APIRoute } from 'astro';
import { saverWorks } from '../../lib/screensaver';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ works: saverWorks() }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
