import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChessService, ChessGame } from './chess.service';

export interface ChessStatePayload {
  roomId: string;
  fen: string;
  pgn: string;
  turn: string;
  clocks: { w: number | null; b: number | null };
  status: string;
  reason: string | null;
  winner: string | null;
  seats: { w: string | null; b: string | null };
}

@Injectable()
export class ChessGateway {
  private broadcasts = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private readonly chessService: ChessService) {}

  attach(io: Server) {
    io.on('connection', (socket: Socket) => {
      console.log('chess gateway: client connected', socket.id);

      socket.on('room:create', (payload: { timeControlId?: string; playerColor?: 'w' | 'b' }) => {
        const timeControlId = payload?.timeControlId || 'untimed';
        const game = this.chessService.createGame(socket.id, timeControlId, payload?.playerColor);
        socket.join('game:' + game.id);
        socket.data.gameId = game.id;
        socket.data.color = game.players.w === socket.id ? 'w' : 'b';
        this.chessService.startClock(game.id);
        this.startBroadcast(io, game.id);
        socket.emit('room:created', { roomId: game.id, state: this.toState(game) } as any);
      });

      socket.on('room:join', (payload: { roomId?: string }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        // Re-joining your own room must not steal the open seat.
        const seated: 'w' | 'b' | null =
          game.players.w === socket.id ? 'w' : game.players.b === socket.id ? 'b' : null;
        if (seated) {
          socket.join('game:' + game.id);
          socket.data.gameId = game.id;
          socket.data.color = seated;
          socket.emit('room:joined', { roomId: game.id, state: this.toState(game) } as any);
          return;
        }
        if (game.players.w && game.players.b) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }
        const color: 'w' | 'b' = !game.players.w ? 'w' : 'b';
        game.players[color] = socket.id;
        socket.join('game:' + game.id);
        socket.data.gameId = game.id;
        socket.data.color = color;
        this.chessService.startClock(game.id);
        this.startBroadcast(io, game.id);
        socket.emit('room:joined', { roomId: game.id, state: this.toState(game) } as any);
        // Let the host know the opponent arrived.
        socket.to('game:' + game.id).emit('state', this.toState(game));
      });

      socket.on('move', (payload: { roomId?: string; from?: string; to?: string; promotion?: string }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        const applied = this.chessService.makeMove(
          game.id,
          payload.from || '',
          payload.to || '',
          payload.promotion || '',
          socket.id
        );
        if (!applied) {
          socket.emit('error', { message: 'Illegal move' });
          return;
        }
        io.to('game:' + game.id).emit('state', this.toState(applied));
        if (applied.status !== 'playing') {
          this.chessService.stopClock(game.id);
          this.stopBroadcast(game.id);
        }
      });

      socket.on('resign', (payload: { roomId?: string }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        const resigned = this.chessService.resign(game.id, socket.id);
        if (!resigned) {
          socket.emit('error', { message: 'Not your game' });
          return;
        }
        this.chessService.stopClock(game.id);
        this.stopBroadcast(game.id);
        io.to('game:' + game.id).emit('state', this.toState(resigned));
      });

      socket.on('draw:offer', (payload: { roomId?: string }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        const target = this.chessService.offerDraw(game.id, socket.id);
        if (!target) {
          socket.emit('error', { message: 'Cannot offer a draw now' });
          return;
        }
        socket.to('game:' + game.id).emit('draw:offer', { from: socket.id });
      });

      socket.on('draw:response', (payload: { roomId?: string; accept?: boolean }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        const result = this.chessService.respondDraw(game.id, socket.id, !!payload?.accept);
        if (!result) {
          socket.emit('error', { message: 'No draw offer to respond to' });
          return;
        }
        if (result === 'accepted') {
          this.chessService.stopClock(game.id);
          this.stopBroadcast(game.id);
          io.to('game:' + game.id).emit('draw:accepted', { roomId: game.id });
          io.to('game:' + game.id).emit('state', this.chessService.getState(game.id));
        } else {
          io.to('game:' + game.id).emit('draw:declined', { roomId: game.id });
        }
      });

      socket.on('rematch:offer', (payload: { roomId?: string }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        socket.to('game:' + game.id).emit('rematch:offer', { from: socket.id });
      });

      socket.on('rematch:accept', (payload: { roomId?: string }) => {
        const roomId = payload?.roomId;
        const game = roomId ? this.chessService.getGame(roomId) : undefined;
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        const reset = this.chessService.resetGame(game.id);
        if (!reset) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        this.chessService.startClock(game.id);
        this.startBroadcast(io, game.id);
        io.to('game:' + game.id).emit('rematch:accepted', { roomId: game.id });
        io.to('game:' + game.id).emit('state', this.chessService.getState(game.id));
      });

      socket.on('disconnect', () => {
        const gameId = (socket.data as any)?.gameId as string | undefined;
        if (gameId) {
          this.chessService.stopClock(gameId);
          this.stopBroadcast(gameId);
          this.chessService.removeGame(gameId);
        }
      });
    });
  }

  private startBroadcast(io: Server, roomId: string) {
    if (this.broadcasts.has(roomId)) return;
    const t = setInterval(() => {
      const st = this.chessService.getState(roomId);
      if (!st) {
        this.stopBroadcast(roomId);
        return;
      }
      io.to('game:' + roomId).emit('state', st);
      if (st.status !== 'playing') this.stopBroadcast(roomId);
    }, 1000);
    this.broadcasts.set(roomId, t);
  }

  private stopBroadcast(roomId: string) {
    const t = this.broadcasts.get(roomId);
    if (t) {
      clearInterval(t);
      this.broadcasts.delete(roomId);
    }
  }

  private toState(game: ChessGame): ChessStatePayload {
    return {
      roomId: game.id,
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      turn: game.chess.turn(),
      clocks: { ...game.clocks },
      status: game.status,
      reason: game.reason,
      winner: game.winner,
      seats: { w: game.players.w, b: game.players.b }
    };
  }
}
