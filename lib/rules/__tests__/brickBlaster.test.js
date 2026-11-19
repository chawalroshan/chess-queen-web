import { describe, expect, it } from 'vitest';
import {
  BASE_SPEED,
  COLS,
  LIVES,
  MAX_BOUNCE_ANGLE,
  MAX_SPEED,
  ROWS,
  ballSpeed,
  brickBounce,
  bricksLeft,
  circleRectHit,
  createBricks,
  paddleBounce,
  rowPoints
} from '../brickBlaster.js';

describe('createBricks', () => {
  it('builds a full grid on level 1', () => {
    const bricks = createBricks(1);
    expect(bricks).toHaveLength(COLS * ROWS);
    expect(bricks.every((b) => b.hp === 1)).toBe(true);
    expect(bricksLeft(bricks)).toBe(COLS * ROWS);
  });

  it('gives the top rows more points than the bottom rows', () => {
    const bricks = createBricks(1);
    const top = bricks.find((b) => b.row === 0);
    const bottom = bricks.find((b) => b.row === ROWS - 1);
    expect(top.points).toBeGreaterThan(bottom.points);
    expect(bottom.points).toBe(10);
  });

  it('adds rows as the level climbs, but caps the grid', () => {
    const lv3 = createBricks(3);
    const rows3 = Math.max(...lv3.map((b) => b.row)) + 1;
    expect(rows3).toBe(ROWS + 1);
    const lv99 = createBricks(99);
    const rows99 = Math.max(...lv99.map((b) => b.row)) + 1;
    expect(rows99).toBe(8);
    expect(lv99).toHaveLength(COLS * 8);
  });

  it('makes the top two rows take two hits from level 3', () => {
    const bricks = createBricks(3);
    expect(bricks.filter((b) => b.row < 2).every((b) => b.hp === 2)).toBe(true);
    expect(bricks.filter((b) => b.row >= 2).every((b) => b.hp === 1)).toBe(true);
  });

  it('treats level 0 or negative as level 1', () => {
    expect(createBricks(0)).toHaveLength(COLS * ROWS);
    expect(createBricks(-5)).toHaveLength(COLS * ROWS);
  });
});

describe('bricksLeft', () => {
  it('counts only bricks with hp remaining', () => {
    const bricks = createBricks(1);
    bricks[0].hp = 0;
    bricks[1].hp = 0;
    expect(bricksLeft(bricks)).toBe(COLS * ROWS - 2);
  });

  it('is zero for a cleared board', () => {
    const bricks = createBricks(1).map((b) => ({ ...b, hp: 0 }));
    expect(bricksLeft(bricks)).toBe(0);
  });
});

describe('rowPoints', () => {
  it('scales with the row count', () => {
    expect(rowPoints(0, 6)).toBe(60);
    expect(rowPoints(5, 6)).toBe(10);
    expect(rowPoints(0, 8)).toBe(80);
  });
});

describe('ballSpeed', () => {
  it('starts at the base speed', () => {
    expect(ballSpeed(1)).toBe(BASE_SPEED);
  });

  it('ramps per level and never exceeds the cap', () => {
    expect(ballSpeed(2)).toBeGreaterThan(ballSpeed(1));
    expect(ballSpeed(999)).toBe(MAX_SPEED);
    expect(ballSpeed(0)).toBe(BASE_SPEED);
  });
});

describe('paddleBounce', () => {
  it('sends a centre hit straight up', () => {
    const v = paddleBounce(480, 480, 120, 400);
    expect(v.vx).toBeCloseTo(0, 6);
    expect(v.vy).toBeCloseTo(-400, 6);
  });

  it('sends an edge hit out at the maximum angle', () => {
    const v = paddleBounce(540, 480, 120, 400);
    expect(v.vx).toBeCloseTo(Math.sin(MAX_BOUNCE_ANGLE) * 400, 6);
    expect(v.vy).toBeCloseTo(-Math.cos(MAX_BOUNCE_ANGLE) * 400, 6);
  });

  it('mirrors left and right hits', () => {
    const left = paddleBounce(420, 480, 120, 400);
    const right = paddleBounce(540, 480, 120, 400);
    expect(left.vx).toBeCloseTo(-right.vx, 6);
    expect(left.vy).toBeCloseTo(right.vy, 6);
  });

  it('always bounces upward and preserves speed', () => {
    for (let x = 400; x <= 560; x += 5) {
      const v = paddleBounce(x, 480, 120, 420);
      expect(v.vy).toBeLessThan(0);
      expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(420, 5);
    }
  });

  it('clamps hits outside the paddle', () => {
    const v = paddleBounce(9999, 480, 120, 400);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(400, 5);
    expect(Math.abs(v.vx)).toBeCloseTo(Math.sin(MAX_BOUNCE_ANGLE) * 400, 6);
  });
});

describe('brickBounce', () => {
  const rect = { x: 100, y: 100, w: 60, h: 24 };

  it('flips vy when the ball came from above', () => {
    const res = brickBounce({ vx: 120, vy: 200, r: 8 }, rect, 120, 80);
    expect(res).toEqual({ vx: 120, vy: -200, axis: 'y' });
  });

  it('flips vy when the ball came from below', () => {
    const res = brickBounce({ vx: 120, vy: -200, r: 8 }, rect, 120, 140);
    expect(res).toEqual({ vx: 120, vy: 200, axis: 'y' });
  });

  it('flips vx when the ball came from the side', () => {
    const res = brickBounce({ vx: 200, vy: 60, r: 8 }, rect, 80, 110);
    expect(res).toEqual({ vx: -200, vy: 60, axis: 'x' });
  });

  it('falls back to the dominant axis when the ball is already overlapping', () => {
    const res = brickBounce({ vx: 300, vy: 40, r: 8 }, rect, 120, 110);
    expect(res.axis).toBe('x');
    expect(res.vx).toBe(-300);
  });
});

describe('circleRectHit', () => {
  const rect = { x: 100, y: 100, w: 60, h: 24 };

  it('detects a hit inside the rect', () => {
    expect(circleRectHit(120, 110, 8, rect)).toBe(true);
  });

  it('detects a hit on the rect edge', () => {
    expect(circleRectHit(100 - 7, 110, 8, rect)).toBe(true);
  });

  it('misses when far away', () => {
    expect(circleRectHit(0, 0, 8, rect)).toBe(false);
    expect(circleRectHit(100 - 9, 110, 8, rect)).toBe(false);
  });

  it('misses near a corner', () => {
    expect(circleRectHit(92, 92, 8, rect)).toBe(false);
    expect(circleRectHit(92, 92, 12, rect)).toBe(true);
  });
});

describe('lives', () => {
  it('starts with three lives', () => {
    expect(LIVES).toBe(3);
  });
});
