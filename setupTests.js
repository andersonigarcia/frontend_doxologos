import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
import { BroadcastChannel as NodeBroadcastChannel } from 'worker_threads';

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

if (!global.TransformStream) {
  global.TransformStream = TransformStream;
}

if (!global.BroadcastChannel) {
  global.BroadcastChannel = NodeBroadcastChannel;
}

if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream;
}

if (!global.WritableStream) {
  global.WritableStream = WritableStream;
}

const serverPromise = import('./tests/msw/server.js').then((mod) => mod.server);

serverPromise.then((server) => {
  server.events.on('request:start', ({ request }) => {
    console.log('[MSW] request', request.method, request.url);
  });
  server.events.on('request:unhandled', ({ request }) => {
    console.warn('[MSW] Unhandled', request.method, request.url);
  });
  server.events.on('response:mocked', async ({ request, response }) => {
    const clone = response.clone();
    let body;
    try {
      body = await clone.json();
    } catch (err) {
      body = '<non-json>';
    }
    console.log('[MSW] response', request.url, body);
  });
});

beforeAll(async () => {
  const server = await serverPromise;
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(async () => {
  const server = await serverPromise;
  server.resetHandlers();
});

afterAll(async () => {
  const server = await serverPromise;
  server.close();
});

// Common browser APIs mocked for jsdom
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  });
}

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = IntersectionObserver;
}

Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
  set: () => {},
  get: () => true
});

HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = () => {};

window.scrollTo = window.scrollTo || (() => {});
