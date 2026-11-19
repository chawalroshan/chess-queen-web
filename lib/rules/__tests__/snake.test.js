import { describe, expect, it } from 'vitest';
import {
  COLS,
  FOOD_POINTS,
  MAX_BUFFER,
  MAX_SPEED,
  MIN_SPEED,
  ROWS,
  createState,
  dirFromName,
  isOpposite,
  queueDirection,
  spawnFood,
  speedFor,
  step
} from '../snake.js';

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

function fresh(seed = 1) {
  return createState({ cols: COLS, rows: ROWS, rng: seeded(seed) });
}

describe('createState', () => {
  it('starts with a 3-segment snake and 0 score on a 20x20 board', () => {
    const s = fresh();
    expect(s.cols).toBe(20);
    expect(s.rows).toBe(20);
    expect(s.snake).toHaveLength(3);
    expect(s.score).toBe(0);
    expect(s.alive).toBe(true);
  });

  it('places food on a free cell', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = fresh(seed);
      expect(s.food).toBeTruthy();
      expect(s.snake.some((p) => p.x === s.food.x && p.y === s.food.y)).toBe(false);
    }
  });

  it('never spawns food on the snake while growing', () => {
    const s = fresh(7);
    for (let i = 0; i < 60; i++) {
      spawnFood(s);
      expect(s.snake.some((p) => p.x === s.food.x && p.y === s.food.y)).toBe(false);
    }
  });

  it('reports a win when the board is full', () => {
    const s = fresh();
    s.snake = [];
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) s.snake.push({ x, y });
    expect(spawnFood(s)).toBeNull();
    expect(s.won).toBe(true);
  });
});

describe('queueDirection', () => {
  it('rejects a 180-degree reversal', () => {
    const s = fresh();
    expect(s.dir).toEqual({ x: 1, y: 0 });
    expect(queueDirection(s, dirFromName('left'))).toBe(false);
  });

  it('accepts a perpendicular turn', () => {
    const s = fresh();
    expect(queueDirection(s, dirFromName('up'))).toBe(true);
    expect(s.queue).toHaveLength(1);
  });

  it('buffers at most two turns and rejects duplicates', () => {
    const s = fresh();
    expect(queueDirection(s, dirFromName('up'))).toBe(true);
    expect(queueDirection(s, dirFromName('up'))).toBe(false);
    expect(queueDirection(s, dirFromName('left'))).toBe(true);
    expect(queueDirection(s, dirFromName('down'))).toBe(false);
    expect(s.queue).toHaveLength(MAX_BUFFER);
  });

  it('validates against the last queued turn, not the current one', () => {
    const s = fresh();
    queueDirection(s, dirFromName('up'));
    // Moving right, queued up: down is a reversal of the queued direction.
    expect(queueDirection(s, dirFromName('down'))).toBe(false);
  });

  it('applies buffered turns one per step', () => {
    const s = fresh();
    queueDirection(s, dirFromName('up'));
    queueDirection(s, dirFromName('left'));
    step(s);
    expect(s.dir).toEqual({ x: 0, y: -1 });
    step(s);
    expect(s.dir).toEqual({ x: -1, y: 0 });
  });
});

describe('step', () => {
  it('moves forward and keeps the length', () => {
    const s = fresh();
    const head = { ...s.snake[0] };
    s.food = { x: 0, y: 0 };
    step(s);
    expect(s.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    expect(s.snake).toHaveLength(3);
  });

  it('awards exactly 10 points and grows when eating', () => {
    const s = fresh();
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y };
    const res = step(s);
    expect(res.ate).toBe(true);
    expect(s.score).toBe(FOOD_POINTS);
    expect(s.snake).toHaveLength(4);
  });

  it('dies on the wall', () => {
    const s = fresh();
    s.snake = [{ x: s.cols - 1, y: 5 }, { x: s.cols - 2, y: 5 }, { x: s.cols - 3, y: 5 }];
    s.dir = { x: 1, y: 0 };
    s.food = { x: 0, y: 0 };
    const res = step(s);
    expect(res.dead).toBe(true);
    expect(s.alive).toBe(false);
  });

  it('allows moving into the cell the tail is vacating', () => {
    // 2x2 loop: head follows the tail every step.
    const s = createState({ cols: 6, rows: 6, rng: seeded(3) });
    s.snake = [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 }
    ];
    s.dir = { x: 1, y: 0 };
    s.food = { x: 0, y: 0 };
    // Head moves to (3,2), which is the current tail -> legal.
    const res = step(s);
    expect(res.dead).toBe(false);
    expect(s.snake[0]).toEqual({ x: 3, y: 2 });
  });

  it('still collides with the tail cell when growing', () => {
    const s = createState({ cols: 6, rows: 6, rng: seeded(4) });
    s.snake = [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 }
    ];
    s.dir = { x: 1, y: 0 };
    s.food = { x: 3, y: 2 }; // eating keeps the tail in place -> collision
    const res = step(s);
    expect(res.dead).toBe(true);
  });

  it('dies when biting its own body', () => {
    const s = createState({ cols: 8, rows: 8, rng: seeded(5) });
    s.snake = [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 }
    ];
    s.dir = { x: 0, y: 1 };
    s.food = { x: 0, y: 0 };
    expect(step(s).dead).toBe(true);
  });
});

describe('speedFor', () => {
  it('starts at 8 steps per second', () => {
    expect(speedFor(0)).toBe(MIN_SPEED);
  });

  it('ramps up with score and caps at 18', () => {
    expect(speedFor(30)).toBe(9);
    expect(speedFor(300)).toBe(MAX_SPEED);
    expect(speedFor(99999)).toBe(MAX_SPEED);
  });
});

describe('helpers', () => {
  it('isOpposite detects reversals only', () => {
    expect(isOpposite({ x: 1, y: 0 }, { x: -1, y: 0 })).toBe(true);
    expect(isOpposite({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(false);
  });
});
