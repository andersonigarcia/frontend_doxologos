import { http, HttpResponse } from 'msw';
import { TEST_SUPABASE_URL } from './constants.js';

export const handlers = [
  http.get('/__healthcheck__', () => HttpResponse.json({ ok: true }))
];
