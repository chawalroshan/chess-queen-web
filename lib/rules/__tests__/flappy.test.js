import { describe, expect, it } from 'vitest';
import {
  BIRD_R,
  FLAP_VY,
  GAP,
  GRAVITY,
  MAX_GAP_SHIFT,
  PIPE_W,
  PLAY_HEIGHT,
  SPACING,
  WIDTH,
  clampGap,
  createState,
  flap,
  gapFor,
  medalFor,
  pipeRects,
  resetState,
  speedFor,
  step
} from '../flappy.js';

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

const DT = 1 / 60;

function fresh(seed = 7) {
  return createState(seeded(seed));
}

describe('createState', () => {
  it('starts idle, alive, score 0, with one pending pipe', () => {
    const s = fresh();
    expect(s.score).toBe(0);
    expect(s.alive).toBe(true);
    expect(s.started).toBe(false);
    expect(s.pipes).toHaveLength(1);
    expect(s.pipes[0].x).toBeGreaterThan(WIDTH);
  });

  it('starts with the bird inside the play area', () => {
    const s = fresh();
    expect(s.bird.y).toBeGreaterThan(BIRD_R);
    expect(s.bird.y).toBeLessThan(PLAY_HEIGHT - BIRD_R);
  });

  it('places the first gap inside the reachable band', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = fresh(seed);
      expect(s.pipes[0].gapY).toBeGreaterThan(GAP / 2);
      expect(s.pipes[0].gapY).toBeLessThan(PLAY_HEIGHT - GAP / 2);
    }
  });
});

describe('flap', () => {
  it('sets the bird upward and marks the run started', () => {
    const s = fresh();
    expect(flap(s)).toBe(true);
    expect(s.bird.vy).toBe(FLAP_VY);
    expect(s.started).toBe(true);
  });

  it('does nothing once the bird is dead', () => {
    const s = fresh();
    s.alive = false;
    expect(flap(s)).toBe(false);
  });
});

describe('step', () => {
  it('applies gravity while started', () => {
    const s = fresh();
    flap(s);
    const before = s.bird.vy;
    step(s, DT);
    expect(s.bird.vy).toBeCloseTo(before + GRAVITY * DT, 5);
  });

  it('does not move the bird before the first flap', () => {
    const s = fresh();
    const y = s.bird.y;
    step(s, DT);
    expect(s.bird.y).toBe(y);
  });

  it('clamps the ceiling instead of killing the bird', () => {
    const s = fresh();
    s.started = true;
    s.bird.y = 4;
    s.bird.vy = -500;
    const res = step(s, DT);
    expect(res.died).toBe(false);
    expect(s.alive).toBe(true);
    expect(s.bird.y).toBe(BIRD_R);
    expect(s.bird.vy).toBe(0);
  });

  it('kills the bird on the ground', () => {
    const s = fresh();
    s.started = true;
    s.bird.y = PLAY_HEIGHT - BIRD_R - 1;
    s.bird.vy = 400;
    const res = step(s, DT);
    expect(res.died).toBe(true);
    expect(s.alive).toBe(false);
  });

  it('scores a pipe exactly once when it passes the bird', () => {
    const s = fresh();
    s.started = true;
    s.pipes = [{ x: s.bird.x - BIRD_R - PIPE_W - 1, gapY: PLAY_HEIGHT / 2, gap: GAP, scored: false }];
    const res = step(s, DT);
    expect(res.scored).toBe(true);
    expect(s.score).toBe(1);
    const again = step(s, DT);
    expect(again.scored).toBe(false);
    expect(s.score).toBe(1);
  });

  it('kills the bird when it hits a pipe body', () => {
    const s = fresh();
    s.started = true;
    s.bird.x = 200;
    s.bird.y = 100;
    s.pipes = [{ x: 200 - PIPE_W / 2, gapY: PLAY_HEIGHT / 2, gap: GAP, scored: false }];
    const res = step(s, DT);
    expect(res.died).toBe(true);
    expect(s.alive).toBe(false);
  });

  it('lets the bird through the middle of the gap', () => {
    const s = fresh();
    s.started = true;
    s.bird.x = 200;
    s.bird.y = PLAY_HEIGHT / 2;
    s.pipes = [{ x: 200 - PIPE_W / 2, gapY: PLAY_HEIGHT / 2, gap: GAP, scored: false }];
    const res = step(s, DT);
    expect(res.died).toBe(false);
    expect(s.alive).toBe(true);
  });

  it('keeps spawning pipes at the configured spacing', () => {
    const s = fresh();
    s.started = true;
    s.pipes = [{ x: WIDTH - SPACING, gapY: PLAY_HEIGHT / 2, gap: GAP, scored: true }];
    step(s, DT);
    expect(s.pipes.length).toBe(2);
    const [a, b] = s.pipes;
    expect(Math.round(b.x - a.x)).toBe(SPACING);
  });

  it('limits each new gap to a reachable shift', () => {
    const s = fresh();
    s.started = true;
    s.bird.y = 40;
    s.pipes = [{ x: WIDTH - SPACING, gapY: 120, gap: GAP, scored: true }];
    step(s, DT);
    const next = s.pipes[1];
    expect(Math.abs(next.gapY - 120)).toBeLessThanOrEqual(MAX_GAP_SHIFT + 0.001);
  });

  it('never spawns a gap outside the playable band', () => {
    const s = fresh(99);
    s.started = true;
    for (let i = 0; i < 600; i++) {
      step(s, DT);
      for (const p of s.pipes) {
        expect(p.gapY - p.gap / 2).toBeGreaterThanOrEqual(0);
        expect(p.gapY + p.gap / 2).toBeLessThanOrEqual(PLAY_HEIGHT);
      }
      if (!s.alive) {
        s.alive = true;
        s.bird.y = PLAY_HEIGHT / 2;
        s.bird.vy = 0;
      }
    }
  });

  it('drops pipes that scrolled off screen', () => {
    const s = fresh();
    s.started = true;
    s.pipes = [{ x: -PIPE_W - 40, gapY: PLAY_HEIGHT / 2, gap: GAP, scored: true }];
    step(s, DT);
    expect(s.pipes.every((p) => p.x + PIPE_W > -24)).toBe(true);
  });

  it('is a no-op when already dead', () => {
    const s = fresh();
    s.alive = false;
    const y = s.bird.y;
    const res = step(s, DT);
    expect(res).toEqual({ scored: false, died: false });
    expect(s.bird.y).toBe(y);
  });
});

describe('difficulty', () => {
  it('ramps speed and shrinks the gap, with hard caps', () => {
    expect(speedFor(0)).toBeLessThan(speedFor(10));
    expect(speedFor(10)).toBeLessThanOrEqual(238);
    expect(speedFor(10000)).toBe(238);
    expect(gapFor(0)).toBeGreaterThan(gapFor(10));
    expect(gapFor(10000)).toBe(138);
  });
});

describe('clampGap', () => {
  it('keeps gaps inside the play area', () => {
    expect(clampGap(-500)).toBe(GAP / 2 + 34);
    expect(clampGap(99999)).toBe(PLAY_HEIGHT - GAP / 2 - 34);
    expect(clampGap(NaN)).toBe((GAP / 2 + 34 + PLAY_HEIGHT - GAP / 2 - 34) / 2);
  });
});

describe('pipeRects', () => {
  it('splits the pipe around its gap', () => {
    const r = pipeRects({ x: 100, gapY: 280, gap: 160 });
    expect(r.top).toEqual({ x: 100, y: 0, w: PIPE_W, h: 200 });
    expect(r.bottom.y).toBe(360);
    expect(r.bottom.h).toBe(PLAY_HEIGHT - 360);
  });
});

describe('medals', () => {
  it('awards nothing below bronze and the right medal above it', () => {
    expect(medalFor(0)).toBe(null);
    expect(medalFor(9)).toBe(null);
    expect(medalFor(10).id).toBe('bronze');
    expect(medalFor(20).id).toBe('silver');
    expect(medalFor(30).id).toBe('gold');
    expect(medalFor(40).id).toBe('platinum');
    expect(medalFor(400).id).toBe('platinum');
  });
});

describe('resetState', () => {
  it('clears score, pipes and death but keeps the rng', () => {
    const s = fresh();
    s.score = 12;
    s.alive = false;
    s.started = true;
    resetState(s, s.rand);
    expect(s.score).toBe(0);
    expect(s.alive).toBe(true);
    expect(s.started).toBe(false);
    expect(s.pipes).toHaveLength(1);
  });
});
