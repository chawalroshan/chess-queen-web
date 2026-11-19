import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  PROMOTION_PIECES,
  canSideMate,
  describeOutcome,
  evaluateOutcome,
  flagOutcome,
  needsPromotion
} from '../chess.js';

function play(moves) {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c;
}

describe('evaluateOutcome', () => {
  it('detects checkmate and winner', () => {
    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    const c = play(['f3', 'e5', 'g4', 'Qh4#']);
    const o = evaluateOutcome(c);
    expect(o.status).toBe('checkmate');
    expect(o.winner).toBe('b');
    expect(o.reason).toBe('checkmate');
  });

  it('detects stalemate', () => {
    const c = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const o = evaluateOutcome(c);
    expect(o.status).toBe('draw');
    expect(o.reason).toBe('stalemate');
    expect(o.winner).toBeNull();
  });

  it('detects insufficient material', () => {
    const c = new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    const o = evaluateOutcome(c);
    expect(o.status).toBe('draw');
    expect(o.reason).toBe('insufficient');
  });

  it('detects threefold repetition', () => {
    const c = play(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']);
    const o = evaluateOutcome(c);
    expect(o.status).toBe('draw');
    expect(o.reason).toBe('repetition');
  });

  it('detects the fifty-move rule', () => {
    const c = new Chess('8/8/8/4k3/8/8/8/4K2R w - - 99 100');
    c.move('Rh2');
    const o = evaluateOutcome(c);
    expect(o.status).toBe('draw');
    expect(o.reason).toBe('fifty');
  });

  it('reports playing for the initial position', () => {
    expect(evaluateOutcome(new Chess()).status).toBe('playing');
  });
});

describe('canSideMate / flagOutcome', () => {
  it('knows a lone king cannot mate', () => {
    const c = new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    expect(canSideMate(c, 'w')).toBe(false);
    expect(canSideMate(c, 'b')).toBe(false);
  });

  it('knows a pawn can mate', () => {
    const c = new Chess('8/8/8/4k3/8/8/6P1/4K3 w - - 0 1');
    expect(canSideMate(c, 'w')).toBe(true);
  });

  it('flag fall is a draw when the opponent cannot mate', () => {
    const c = new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    const o = flagOutcome(c, 'w');
    expect(o.status).toBe('draw');
    expect(o.reason).toBe('insufficient');
  });

  it('flag fall is a loss when the opponent can mate', () => {
    const c = new Chess('8/6p1/8/4k3/8/8/8/4K3 w - - 0 1');
    const o = flagOutcome(c, 'w');
    expect(o.status).toBe('timeout');
    expect(o.winner).toBe('b');
  });
});

describe('needsPromotion', () => {
  it('detects white pawn reaching the 8th rank', () => {
    const c = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    expect(needsPromotion(c, 'a7', 'a8')).toBe(true);
  });

  it('ignores normal pawn moves', () => {
    const c = new Chess();
    expect(needsPromotion(c, 'e2', 'e4')).toBe(false);
  });

  it('ignores non-pawn pieces', () => {
    const c = new Chess('8/8/8/8/8/8/8/R3K2k w - - 0 1');
    expect(needsPromotion(c, 'a1', 'a8')).toBe(false);
  });
});

describe('describeOutcome', () => {
  it('uses perspective wording for checkmate', () => {
    expect(describeOutcome({ status: 'checkmate', reason: 'checkmate', winner: 'b' }, 'b')).toBe('You win — checkmate');
    expect(describeOutcome({ status: 'checkmate', reason: 'checkmate', winner: 'b' }, 'w')).toBe('You lose — checkmate');
  });

  it('labels draw reasons', () => {
    expect(describeOutcome({ status: 'draw', reason: 'repetition', winner: null })).toBe('Draw — threefold repetition');
    expect(describeOutcome({ status: 'draw', reason: 'fifty', winner: null })).toBe('Draw — 50-move rule');
    expect(describeOutcome({ status: 'draw', reason: 'stalemate', winner: null })).toBe('Draw — stalemate');
  });
});

describe('promotion', () => {
  it('offers exactly queen, rook, bishop, knight', () => {
    expect(PROMOTION_PIECES).toEqual(['q', 'r', 'b', 'n']);
  });

  it('applies an underpromotion and records it in SAN', () => {
    const c = new Chess('r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1');
    expect(needsPromotion(c, 'b7', 'a8')).toBe(true);
    const move = c.move({ from: 'b7', to: 'a8', promotion: 'n' });
    expect(move.promotion).toBe('n');
    expect(move.san).toBe('bxa8=N');
    expect(c.get('a8')).toMatchObject({ type: 'n', color: 'w' });
  });
});
