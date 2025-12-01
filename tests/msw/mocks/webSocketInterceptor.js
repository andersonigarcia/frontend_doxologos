export class WebSocketInterceptor {
  constructor() {
    this.listeners = new Map();
  }

  apply() {
    return this;
  }

  on(event, listener) {
    this.listeners.set(event, listener);
  }

  dispose() {
    this.listeners.clear();
  }
}
