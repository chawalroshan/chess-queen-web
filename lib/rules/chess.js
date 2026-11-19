// Pure chess outcome rules. No DOM, no canvas, no React.
// Used by the React chess UI and mirrored by server/src/chess.rules.ts.

export const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

// Can this side possibly deliver mate (with cooperation)?
// Pawn/rook/queen always can. Two minor pieces can. Lone bishop/knight cannot.
export function canSideMate(chess, color) {
  const board = chess.board();
  let pawns = 0, rooks = 0, queens = 0, bishops = 0, knights = 0;
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

// Full game outcome with a reason. status: playing | checkmate | draw | resigned | timeout
export function evaluateOutcome(chess) {
  if (!chess) return { status: 'playing', reason: null, winner: null };
  const turn = chess.turn();
  const other = turn === 'w' ? 'b' : 'w';
  if (chess.isCheckmate()) return { status: 'checkmate', reason: 'checkmate', winner: other };
  if (chess.isStalemate()) return { status: 'draw', reason: 'stalemate', winner: null };
  if (chess.isInsufficientMaterial()) return { status: 'draw', reason: 'insufficient', winner: null };
  if (chess.isThreefoldRepetition()) return { status: 'draw', reason: 'repetition', winner: null };
  if (chess.isDrawByFiftyMoves()) return { status: 'draw', reason: 'fifty', winner: null };
  if (chess.isDraw()) return { status: 'draw', reason: 'draw', winner: null };
  return { status: 'playing', reason: null, winner: null };
}

// Flag fall: loss unless the opponent cannot possibly mate.
export function flagOutcome(chess, flaggedColor) {
  const other = flaggedColor === 'w' ? 'b' : 'w';
  if (!canSideMate(chess, other)) return { status: 'draw', reason: 'insufficient', winner: null };
  return { status: 'timeout', reason: 'timeout', winner: other };
}

// Does this move need a promotion choice?
export function needsPromotion(chess, from, to) {
  const piece = chess.get(from);
  if (!piece || piece.type !== 'p') return false;
  const rank = String(to)[1];
  return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
}

const REASON_LABEL = {
  checkmate: 'checkmate',
  stalemate: 'stalemate',
  insufficient: 'insufficient material',
  repetition: 'threefold repetition',
  fifty: '50-move rule',
  agreement: 'agreement',
  timeout: 'flag fall',
  resigned: 'resignation',
  draw: 'draw'
};

// Human-readable result. perspectiveColor optional ('w'|'b') -> "You win/lose".
export function describeOutcome(outcome, perspectiveColor) {
  const { status, reason, winner } = outcome || {};
  const side = (c) => (c === 'w' ? 'White' : 'Black');
  if (status === 'checkmate') {
    if (perspectiveColor) return winner === perspectiveColor ? 'You win — checkmate' : 'You lose — checkmate';
    return `${side(winner)} wins — checkmate`;
  }
  if (status === 'resigned') {
    if (perspectiveColor) return winner === perspectiveColor ? 'You win — opponent resigned' : 'You resigned';
    return `${side(winner)} wins — resignation`;
  }
  if (status === 'timeout') {
    if (perspectiveColor) return winner === perspectiveColor ? 'You win — opponent ran out of time' : 'You ran out of time';
    return `${side(winner)} wins — flag fall`;
  }
  if (status === 'draw' || status === 'stalemate') {
    if (reason === 'stalemate') return 'Draw — stalemate';
    return 'Draw — ' + (REASON_LABEL[reason] || 'draw');
  }
  return 'Game over';
}
