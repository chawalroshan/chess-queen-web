// Flappy Pop rules — pure, no DOM, no canvas.
// Classic one-button flyer: constant gravity, impulse flap, fixed-size pipes
// scrolling at a constant speed, and a gap that only shifts a reachable amount
// between pipes.

export const WIDTH = 480;
export const HEIGHT = 640;
export const GROUND = 80;
export const PLAY_HEIGHT = HEIGHT - GROUND;

export const BIRD_X = 140;
export const BIRD_R = 15;
export const GRAVITY = 1400; // px/s^2
export const FLAP_VY = -430; // px/s
export const PIPE_W = 70;
export const GAP = 168;
export const SPACING = 224; // px between pipe left edges
export const SPEED = 168; // px/s scroll
export const MAX_GAP_SHIFT = 118;
export const MAX_FALL = 640; // terminal velocity, px/s

const GAP_MIN = GAP / 2 + 34;
const GAP_MAX = PLAY_HEIGHT - GAP / 2 - 34;

export const MEDALS = [
  { id: 'platinum', label: 'Platinum', min: 40, color: '#dbeafe' },
  { id: 'gold', label: 'Gold', min: 30, color: '#fbbf24' },
  { id: 'silver', label: 'Silver', min: 20, color: '#cbd5e1' },
  { id: 'bronze', label: 'Bronze', min: 10, color: '#d97706' }
];

export function medalFor(score) {
  const s = Math.max(0, Math.floor(score) || 0);
  for (const m of MEDALS) if (s >= m.min) return m;
  return null;
}

export function clampGap(y) {
  if (!Number.isFinite(y)) return (GAP_MIN + GAP_MAX) / 2;
  return Math.min(GAP_MAX, Math.max(GAP_MIN, y));
}

// Difficulty ramps with score but stops at a hard cap.
export function speedFor(score) {
  const s = Math.max(0, Math.floor(score) || 0);
  return Math.min(SPEED + s * 2.2, 238);
}

export function gapFor(score) {
  const s = Math.max(0, Math.floor(score) || 0);
  return Math.max(GAP - s * 1.8, 138);
}

function newPipe(x, gapY, gap) {
  return { x, gapY, gap, scored: false };
}

export function createState(rng) {
  const rand = typeof rng === 'function' ? rng : Math.random;
  const first = clampGap(PLAY_HEIGHT * 0.42 + (rand() * 2 - 1) * 40);
  return {
    bird: { x: BIRD_X, y: PLAY_HEIGHT * 0.42, vy: 0 },
    pipes: [newPipe(WIDTH + 120, first, gapFor(0))],
    score: 0,
    alive: true,
    started: false,
    t: 0,
    rand
  };
}

export function resetState(state, rng) {
  const rand = typeof rng === 'function' ? rng : (state && state.rand) || Math.random;
  const first = clampGap(PLAY_HEIGHT * 0.42 + (rand() * 2 - 1) * 40);
  state.bird = { x: BIRD_X, y: PLAY_HEIGHT * 0.42, vy: 0 };
  state.pipes = [newPipe(WIDTH + 120, first, gapFor(0))];
  state.score = 0;
  state.alive = true;
  state.started = false;
  state.t = 0;
  state.rand = rand;
  return state;
}

// A flap is only meaningful while the bird is alive; the first one also starts
// the run so the bird does not fall before the player touches anything.
export function flap(state) {
  if (!state || !state.alive) return false;
  state.started = true;
  state.bird.vy = FLAP_VY;
  return true;
}

// Advance one fixed step. Returns { scored, died }.
export function step(state, dt) {
  const out = { scored: false, died: false };
  if (!state || !state.alive) return out;

  const h = Math.max(0, Math.min(dt, 0.05));
  state.t += h;

  // The world only starts once the player flaps; before that the whole scene
  // is a still frame behind the "Play" overlay.
  if (!state.started) return out;

  const bird = state.bird;
  bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * h);
  bird.y += bird.vy * h;

  // Ceiling is a clamp, not a death, exactly like the original.
  if (bird.y - BIRD_R < 0) {
    bird.y = BIRD_R;
    if (bird.vy < 0) bird.vy = 0;
  }

  // Ground kills.
  if (bird.y + BIRD_R >= PLAY_HEIGHT) {
    bird.y = PLAY_HEIGHT - BIRD_R;
    state.alive = false;
    out.died = true;
    return out;
  }

  for (const p of state.pipes) {
    p.x -= speedFor(state.score) * h;
    if (!p.scored && p.x + PIPE_W < bird.x - BIRD_R) {
      p.scored = true;
      state.score += 1;
      out.scored = true;
    }
  }

  // Recycle off-screen pipes, then keep one pending pipe on the right edge so
  // spacing never drifts.
  state.pipes = state.pipes.filter((p) => p.x + PIPE_W > -24);
  const last = state.pipes[state.pipes.length - 1];
  if (!last || last.x <= WIDTH - SPACING) {
    const prevGap = last ? last.gapY : PLAY_HEIGHT * 0.42;
    const shift = (state.rand() * 2 - 1) * MAX_GAP_SHIFT;
    state.pipes.push(newPipe(last ? last.x + SPACING : WIDTH + 40, clampGap(prevGap + shift), gapFor(state.score)));
  }

  // Collision with the 80% hitbox (generous for touch players).
  const half = BIRD_R * 0.8;
  for (const p of state.pipes) {
    if (bird.x + half < p.x || bird.x - half > p.x + PIPE_W) continue;
    const gapTop = p.gapY - p.gap / 2;
    const gapBottom = p.gapY + p.gap / 2;
    if (bird.y - half < gapTop || bird.y + half > gapBottom) {
      state.alive = false;
      out.died = true;
      return out;
    }
  }

  return out;
}

// Rectangles for rendering / debugging. Pure geometry.
export function pipeRects(pipe) {
  const gap = pipe.gap || GAP;
  const top = pipe.gapY - gap / 2;
  const bottom = pipe.gapY + gap / 2;
  return {
    top: { x: pipe.x, y: 0, w: PIPE_W, h: Math.max(0, top) },
    bottom: { x: pipe.x, y: bottom, w: PIPE_W, h: Math.max(0, PLAY_HEIGHT - bottom) }
  };
}
