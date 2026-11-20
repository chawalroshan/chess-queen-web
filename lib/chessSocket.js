// Socket.IO client singleton for the chess online game (Phase 4).
// Server: NestJS + Socket.IO (default http://localhost:3001, override with NEXT_PUBLIC_CHESS_SOCKET_URL).
import { io } from 'socket.io-client';

export const CHESS_SOCKET_URL = process.env.NEXT_PUBLIC_CHESS_SOCKET_URL || 'http://localhost:3001';

const isBrowser = typeof window !== 'undefined';

export const chessSocket = isBrowser
  ? io(CHESS_SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000
    })
  : null;

export function connectChess() {
  if (chessSocket && !chessSocket.connected) chessSocket.connect();
}

export function disconnectChess() {
  if (chessSocket) chessSocket.disconnect();
}

export function emitChess(event, payload) {
  if (chessSocket) chessSocket.emit(event, payload);
}

export function onChess(event, handler) {
  if (!chessSocket) return () => {};
  chessSocket.on(event, handler);
  return () => chessSocket.off(event, handler);
}
