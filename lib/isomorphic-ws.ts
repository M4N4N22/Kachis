/**
 * Browser shim for `isomorphic-ws`.
 * Midnight indexer does `import * as ws from 'isomorphic-ws'` and uses `ws.WebSocket`.
 * The stock package's browser build often fails under Turbopack namespace imports.
 */
const Native =
  (typeof globalThis !== "undefined" && globalThis.WebSocket) ||
  (typeof window !== "undefined" ? window.WebSocket : undefined);

type WsCtor = typeof WebSocket;

const WebSocketImpl = Native as WsCtor;

export default WebSocketImpl;
export { WebSocketImpl as WebSocket };

// Some bundlers read these off the module namespace.
export const CONNECTING = 0;
export const OPEN = 1;
export const CLOSING = 2;
export const CLOSED = 3;
