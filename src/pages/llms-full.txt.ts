import type { APIRoute } from 'astro';
import { llmsFull } from '../lib/llms';

export const GET: APIRoute = () =>
  new Response(llmsFull() + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
