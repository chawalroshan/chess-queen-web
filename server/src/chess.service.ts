import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import { evaluateOutcome, flagOutcome } from './chess.rules';

export const TIME_CONTROLS: Record<string, { base: number; inc: number }> = {
  untimed: { base: 0, inc: 0 },
  '1+0': { base: 60, inc: 0 },
  '2+1': { base: 120, inc: 60 },
  '3+0': { base: 180, inc: 0 },
  '5+0': { base: 300, inc: 0 },
  '10+0': { base: 600, inc: 0 },
  '15+10': { base: 900, inc: 10 }
};

export type GameStatus = 'playing' | 'checkmate' | 'draw' | 'timeout' | 'resigned';

export interface ChessGame {
  id: string;
  chess: Chess;
  players: { w: string | null; b: string | null };
  clocks: { w: number | null; b: number | null };
  timeControlId: string;
  status: GameStatus;
  reason: string | null;
  winner: 'w' | 'b' | null;
  moves: string[];
  pendingDrawFrom: string | null;
}

@Injectable()
export class ChessService {
  private games = new Map<string, ChessGame>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  createGame(hostId: string, timeControlId: string = 'untimed', playerColor?: 'w' | 'b'): ChessGame {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const tc = TIME_CONTROLS[timeControlId] || TIME_CONTROLS['untimed'];
    const chess = new Chess();
    const game: ChessGame = {
      id,
      chess,
      players: { w: null, b: null },
      clocks: { w: null, b: null },
      timeControlId,
      status: 'playing',
      reason: null,
      winner: null,
      moves: [],
      pendingDrawFrom: null
    };
    const color: 'w' | 'b' = playerColor === 'b' ? 'b' : 'w';
    game.players[color] = hostId;
    if (tc.base > 0) {
      game.clocks.w = tc.base;
      game.clocks.b = tc.base;
    }
    this.games.set(id, game);
    return game;
  }

  getGame(roomId: string): ChessGame | undefined {
    return this.games.get(roomId);
  }

  joinGame(roomId: string, playerId: string, playerColor?: 'w' | 'b'): ChessGame | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    const slotEmpty = (c: 'w' | 'b') => (c === 'w' ? !game.players.w : !game.players.b);
    if (!slotEmpty('w') && !slotEmpty('b')) return undefined;
    const color: 'w' | 'b' = playerColor && (slotEmpty('w') || slotEmpty('b')) && ((playerColor === 'w' && slotEmpty('w')) || (playerColor === 'b' && slotEmpty('b'))) ? playerColor : !slotEmpty('w') ? 'b' : 'w';
    game.players[color] = playerId;
    const tc = TIME_CONTROLS[game.timeControlId] || TIME_CONTROLS['untimed'];
    if (tc.base > 0 && game.clocks[color] == null) game.clocks[color] = tc.base;
    return game;
  }

  makeMove(roomId: string, from: string, to: string, promotion: string, bySocketId: string): ChessGame | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    if (game.status !== 'playing') return undefined;
    const turnColor = game.chess.turn();
    if (game.players[turnColor] !== bySocketId) return undefined;
    let move;
    try {
      move = game.chess.move({ from, to, promotion: promotion || undefined });
    } catch {
      // chess.js throws on malformed input; treat it as an illegal move.
      return undefined;
    }
    if (!move) return undefined;
    game.moves.push(move.san);
    const tc = TIME_CONTROLS[game.timeControlId] || TIME_CONTROLS['untimed'];
    if (tc.inc > 0 && move.color) {
      game.clocks[move.color] = (game.clocks[move.color] ?? tc.base) + tc.inc;
    }
    const outcome = evaluateOutcome(game.chess);
    if (outcome.status !== 'playing') {
      game.status = outcome.status;
      game.reason = outcome.reason;
      game.winner = outcome.winner;
    }
    return game;
  }

  resign(roomId: string, socketId: string): ChessGame | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    const sideKey: 'w' | 'b' | null = game.players.w === socketId ? 'w' : game.players.b === socketId ? 'b' : null;
    if (!sideKey) return undefined;
    game.status = 'resigned';
    game.reason = 'resigned';
    game.winner = sideKey === 'w' ? 'b' : 'w';
    return game;
  }

  getState(roomId: string) {
    const game = this.games.get(roomId);
    if (!game) return null;
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

  startClock(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    if (this.intervals.has(gameId)) return;
    const id = setInterval(() => {
      if (game.status !== 'playing') {
        this.stopClock(gameId);
        return;
      }
      // Do not burn anyone's clock before both seats are filled.
      if (!game.players.w || !game.players.b) return;
      const side = game.chess.turn();
      const cur = game.clocks[side];
      if (cur == null) return;
      if (cur <= 0) {
        game.clocks[side] = 0;
        const outcome = flagOutcome(game.chess, side);
        game.status = outcome.status;
        game.reason = outcome.reason;
        game.winner = outcome.winner;
        this.stopClock(gameId);
        return;
      }
      game.clocks[side] = +(cur - 0.25).toFixed(2);
    }, 250);
    this.intervals.set(gameId, id);
  }

  stopClock(gameId: string) {
    const t = this.intervals.get(gameId);
    if (t) {
      clearInterval(t);
      this.intervals.delete(gameId);
    }
  }

  offerDraw(roomId: string, socketId: string): string | null {
    const game = this.games.get(roomId);
    if (!game) return null;
    if (game.status !== 'playing') return null;
    const isPlayer = game.players.w === socketId || game.players.b === socketId;
    if (!isPlayer) return null;
    game.pendingDrawFrom = socketId;
    return game.players.w === socketId ? game.players.b : game.players.w;
  }

  respondDraw(roomId: string, responderId: string, accept: boolean): 'accepted' | 'declined' | null {
    const game = this.games.get(roomId);
    if (!game) return null;
    const offerer = game.pendingDrawFrom;
    if (!offerer) return null;
    // Only the opponent of the offerer may respond.
    const isPlayer = game.players.w === responderId || game.players.b === responderId;
    if (!isPlayer || responderId === offerer) return null;
    game.pendingDrawFrom = null;
    if (accept) {
      game.status = 'draw';
      game.reason = 'agreement';
      game.winner = null;
      return 'accepted';
    }
    return 'declined';
  }

  resetGame(roomId: string): ChessGame | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    const tc = TIME_CONTROLS[game.timeControlId] || TIME_CONTROLS['untimed'];
    game.chess = new Chess();
    game.moves = [];
    game.status = 'playing';
    game.reason = null;
    game.winner = null;
    game.clocks = { w: tc.base > 0 ? tc.base : null, b: tc.base > 0 ? tc.base : null };
    game.pendingDrawFrom = null;
    // Rematch swaps colors.
    const w = game.players.w;
    game.players.w = game.players.b;
    game.players.b = w;
    return game;
  }

  removeGame(roomId: string) {
    this.stopClock(roomId);
    this.games.delete(roomId);
  }
}
