'use client';

// Socket.IO client singleton for the chess online game (Phase 3).
// Server: NestJS + Socket.IO (default http://localhost:3001, override with NEXT_PUBLIC_CHESS_SOCKET_URL).
import { io } from 'socket.io-client';

export const CHESS_SOCKET_URL = process.env.NEXT_PUBLIC_CHESS_SOCKET_URL || 'http://localhost:3001';

export const chessSocket = io(CHESS_SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000
});

export function connectChess() {
  if (!chessSocket.connected) chessSocket.connect();
}

export function disconnectChess() {
  chessSocket.disconnect();
}

export function emitChess(event, payload) {
  chessSocket.emit(event, payload);
}
