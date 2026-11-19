// Pure Neon Snake rules. No DOM, no canvas, no timers.

export const COLS = 20;
export const ROWS = 20;
export const FOOD_POINTS = 10;
export const MIN_SPEED = 8; // steps per second
export const MAX_SPEED = 18;
export const SPEED_POINTS_PER_STEP = 30; // +1 step/s every 30 points
export const MAX_BUFFER = 2;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export function dirFromName(name) {
  return DIRS[name] || null;
}

export function isOpposite(a, b) {
  return !!a && !!b && a.x === -b.x && a.y === -b.y;
}

export function speedFor(score) {
  const steps = Math.floor((Math.max(0, score) || 0) / SPEED_POINTS_PER_STEP);
  return Math.min(MAX_SPEED, MIN_SPEED + steps);
}

export function spawnFood(state) {
  const taken = new Set(state.snake.map((s) => s.x + ',' + s.y));
  const free = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      if (!taken.has(x + ',' + y)) free.push({ x, y });
    }
  }
  if (!free.length) {
    state.food = null;
    state.won = true;
    return null;
  }
  const i = Math.floor(state.rng() * free.length) % free.length;
  state.food = free[i];
  return state.food;
}

export function createState(options) {
  const o = options || {};
  const cols = o.cols || COLS;
  const rows = o.rows || ROWS;
  const rng = o.rng || Math.random;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const state = {
    cols,
    rows,
    rng,
    snake: [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy }
    ],
    dir: { x: 1, y: 0 },
    queue: [],
    food: null,
    score: 0,
    alive: true,
    won: false,
    ate: false
  };
  spawnFood(state);
  return state;
}

// Buffer up to MAX_BUFFER turns. Reject 180-degree turns and duplicates so the
// player can queue "up, left" while the snake is still moving right.
export function queueDirection(state, dir) {
  if (!dir || !state.alive) return false;
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
  if (isOpposite(dir, last)) return false;
  if (dir.x === last.x && dir.y === last.y) return false;
  if (state.queue.length >= MAX_BUFFER) return false;
  state.queue.push({ x: dir.x, y: dir.y });
  return true;
}

export function step(state) {
  if (!state.alive || state.won) return { ate: false, dead: !state.alive, won: state.won };
  if (state.queue.length) state.dir = state.queue.shift();

  const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows) {
    state.alive = false;
    return { ate: false, dead: true, won: false };
  }

  const eating = !!state.food && head.x === state.food.x && head.y === state.food.y;
  // The tail cell frees up this step unless we grow, so it is a legal target.
  const body = eating ? state.snake : state.snake.slice(0, state.snake.length - 1);
  for (let i = 0; i < body.length; i++) {
    if (body[i].x === head.x && body[i].y === head.y) {
      state.alive = false;
      return { ate: false, dead: true, won: false };
    }
  }

  state.snake.unshift(head);
  if (eating) {
    state.score += FOOD_POINTS;
    state.ate = true;
    spawnFood(state);
  } else {
    state.snake.pop();
    state.ate = false;
  }
  return { ate: eating, dead: false, won: state.won };
}
