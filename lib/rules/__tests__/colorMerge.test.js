import { describe, expect, it } from 'vitest';
import {
  SIZE,
  WIN_VALUE,
  canMove,
  createBoard,
  emptyCells,
  mergeLine,
  move,
  spawnTile
} from '../colorMerge.js';

function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boardFrom(rows) {
  const s = createBoard(seeded(1));
  s.cells = rows.flat();
  s.score = 0;
  s.won = false;
  s.over = false;
  return s;
}

describe('createBoard', () => {
  it('starts with exactly two tiles on a 4x4 board', () => {
    const s = createBoard(seeded(2));
    expect(s.cells).toHaveLength(SIZE * SIZE);
    expect(s.cells.filter(Boolean)).toHaveLength(2);
    expect(s.score).toBe(0);
  });

  it('spawns only 2s and 4s', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const s = createBoard(seeded(seed));
      for (const v of s.cells) expect([0, 2, 4]).toContain(v);
    }
  });
});

describe('mergeLine', () => {
  it('merges equal neighbours once', () => {
    expect(mergeLine([2, 2, 0, 0])).toEqual({ line: [4, 0, 0, 0], gained: 4 });
  });

  it('never merges a tile twice in one move', () => {
    expect(mergeLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], gained: 8 });
    expect(mergeLine([4, 4, 8, 0])).toEqual({ line: [8, 8, 0, 0], gained: 8 });
  });

  it('slides without merging different values', () => {
    expect(mergeLine([2, 0, 2, 4])).toEqual({ line: [4, 4, 0, 0], gained: 4 });
    expect(mergeLine([2, 4, 2, 4])).toEqual({ line: [2, 4, 2, 4], gained: 0 });
  });
});

describe('move', () => {
  it('slides left and adds the merged value to the score', () => {
    const s = boardFrom([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    const res = move(s, 'left');
    expect(res.moved).toBe(true);
    expect(res.gained).toBe(4);
    expect(s.score).toBe(4);
    expect(s.cells[0]).toBe(4);
  });

  it('does not spawn a tile when nothing moved', () => {
    const s = boardFrom([
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    const before = s.cells.filter(Boolean).length;
    const res = move(s, 'left');
    expect(res.moved).toBe(false);
    expect(s.cells.filter(Boolean).length).toBe(before);
  });

  it('spawns exactly one new tile after a successful move', () => {
    const s = boardFrom([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    move(s, 'right');
    expect(s.cells.filter(Boolean)).toHaveLength(2);
  });

  it('merges along columns', () => {
    const s = boardFrom([
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [4, 0, 0, 0],
      [4, 0, 0, 0]
    ]);
    move(s, 'up');
    expect(s.cells[0]).toBe(4);
    expect(s.cells[4]).toBe(8);
  });

  it('moves in all four directions', () => {
    for (const dir of ['left', 'right', 'up', 'down']) {
      const s = boardFrom([
        [0, 0, 0, 0],
        [0, 2, 2, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]);
      expect(move(s, dir).moved).toBe(true);
    }
  });

  it('flags a win when a 2048 tile appears', () => {
    const s = boardFrom([
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    move(s, 'left');
    expect(s.cells[0]).toBe(WIN_VALUE);
    expect(s.won).toBe(true);
  });

  it('ignores unknown directions', () => {
    const s = boardFrom([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    expect(move(s, 'sideways')).toEqual({ moved: false, gained: 0 });
  });
});

describe('canMove', () => {
  it('is true with an empty cell', () => {
    const s = boardFrom([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 0]
    ]);
    expect(canMove(s)).toBe(true);
  });

  it('is true when neighbours can merge', () => {
    const s = boardFrom([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4]
    ]);
    expect(canMove(s)).toBe(true);
  });

  it('is false when the board is locked', () => {
    const s = boardFrom([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2]
    ]);
    expect(canMove(s)).toBe(false);
  });
});

describe('spawnTile', () => {
  it('fills an empty cell and returns -1 when full', () => {
    const s = createBoard(seeded(9));
    s.cells = new Array(16).fill(0);
    expect(emptyCells(s)).toHaveLength(16);
    const idx = spawnTile(s);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(s.cells[idx]).toBeGreaterThan(0);
    s.cells = new Array(16).fill(2);
    expect(spawnTile(s)).toBe(-1);
  });
});
