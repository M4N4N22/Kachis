const Socket =
  globalThis.WebSocket ??
  (typeof window !== "undefined" ? window.WebSocket : undefined);

export default Socket;
export { Socket as WebSocket };
