import { Chess } from 'chess.js';

export type OutcomeStatus = 'playing' | 'checkmate' | 'draw' | 'resigned' | 'timeout';

export interface Outcome {
  status: OutcomeStatus;
  reason: string | null;
  winner: 'w' | 'b' | null;
}

// Can this side possibly deliver mate (with cooperation)?
export function canSideMate(chess: Chess, color: 'w' | 'b'): boolean {
  const board = chess.board();
  let pawns = 0;
  let rooks = 0;
  let queens = 0;
  let bishops = 0;
  let knights = 0;
  for (const row of board) {
    for (const sq of row) {
      if (!sq || sq.color !== color) continue;
      if (sq.type === 'p') pawns++;
      else if (sq.type === 'r') rooks++;
      else if (sq.type === 'q') queens++;
      else if (sq.type === 'b') bishops++;
      else if (sq.type === 'n') knights++;
    }
  }
  if (pawns || rooks || queens) return true;
  if (bishops + knights >= 2) return true;
  return false;
}

export function evaluateOutcome(chess: Chess): Outcome {
  const turn = chess.turn();
  const other: 'w' | 'b' = turn === 'w' ? 'b' : 'w';
  if (chess.isCheckmate()) return { status: 'checkmate', reason: 'checkmate', winner: other };
  if (chess.isStalemate()) return { status: 'draw', reason: 'stalemate', winner: null };
  if (chess.isInsufficientMaterial()) return { status: 'draw', reason: 'insufficient', winner: null };
  if (chess.isThreefoldRepetition()) return { status: 'draw', reason: 'repetition', winner: null };
  if (chess.isDrawByFiftyMoves()) return { status: 'draw', reason: 'fifty', winner: null };
  if (chess.isDraw()) return { status: 'draw', reason: 'draw', winner: null };
  return { status: 'playing', reason: null, winner: null };
}

// Flag fall: loss unless the opponent cannot possibly mate.
export function flagOutcome(chess: Chess, flaggedColor: 'w' | 'b'): Outcome {
  const other: 'w' | 'b' = flaggedColor === 'w' ? 'b' : 'w';
  if (!canSideMate(chess, other)) return { status: 'draw', reason: 'insufficient', winner: null };
  return { status: 'timeout', reason: 'timeout', winner: other };
}
