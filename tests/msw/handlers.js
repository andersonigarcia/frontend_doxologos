import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/__healthcheck__', () => HttpResponse.json({ ok: true }))
];
