// Pure 2048-style rules for Color Merge. No DOM, no canvas.

export const SIZE = 4;
export const WIN_VALUE = 2048;
export const SPAWN_FOUR_CHANCE = 0.1;

export function createBoard(rng) {
  const random = rng || Math.random;
  const state = {
    size: SIZE,
    cells: new Array(SIZE * SIZE).fill(0),
    score: 0,
    won: false,
    over: false,
    rng: random,
    moved: false,
    gained: 0,
    merged: []
  };
  spawnTile(state);
  spawnTile(state);
  return state;
}

export function emptyCells(state) {
  const out = [];
  for (let i = 0; i < state.cells.length; i++) if (!state.cells[i]) out.push(i);
  return out;
}

export function spawnTile(state) {
  const free = emptyCells(state);
  if (!free.length) return -1;
  const idx = free[Math.floor(state.rng() * free.length) % free.length];
  state.cells[idx] = state.rng() < SPAWN_FOUR_CHANCE ? 4 : 2;
  return idx;
}

// A line is merged left-to-right: each tile merges at most once per move.
export function mergeLine(line) {
  const compact = line.filter((v) => v);
  const out = [];
  let gained = 0;
  for (let i = 0; i < compact.length; i++) {
    if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
      const v = compact[i] * 2;
      out.push(v);
      gained += v;
      i++;
    } else {
      out.push(compact[i]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained };
}

function readLine(state, dir, index) {
  const n = state.size;
  const out = [];
  for (let k = 0; k < n; k++) {
    let r;
    let c;
    if (dir === 'left') {
      r = index;
      c = k;
    } else if (dir === 'right') {
      r = index;
      c = n - 1 - k;
    } else if (dir === 'up') {
      r = k;
      c = index;
    } else {
      r = n - 1 - k;
      c = index;
    }
    out.push(state.cells[r * n + c]);
  }
  return out;
}

function writeLine(state, dir, index, line) {
  const n = state.size;
  for (let k = 0; k < n; k++) {
    let r;
    let c;
    if (dir === 'left') {
      r = index;
      c = k;
    } else if (dir === 'right') {
      r = index;
      c = n - 1 - k;
    } else if (dir === 'up') {
      r = k;
      c = index;
    } else {
      r = n - 1 - k;
      c = index;
    }
    state.cells[r * n + c] = line[k];
  }
}

export function canMove(state) {
  const n = state.size;
  for (let i = 0; i < state.cells.length; i++) if (!state.cells[i]) return true;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = state.cells[r * n + c];
      if (c + 1 < n && state.cells[r * n + c + 1] === v) return true;
      if (r + 1 < n && state.cells[(r + 1) * n + c] === v) return true;
    }
  }
  return false;
}

export function move(state, dir) {
  if (!['left', 'right', 'up', 'down'].includes(dir)) return { moved: false, gained: 0 };
  const before = state.cells.slice();
  let gained = 0;
  state.merged = [];
  for (let i = 0; i < state.size; i++) {
    const line = readLine(state, dir, i);
    const res = mergeLine(line);
    gained += res.gained;
    writeLine(state, dir, i, res.line);
  }
  let moved = false;
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== state.cells[i]) {
      moved = true;
      break;
    }
  }
  state.moved = moved;
  state.gained = gained;
  if (!moved) return { moved: false, gained: 0 };

  state.score += gained;
  for (const v of state.cells) if (v >= WIN_VALUE) state.won = true;
  state.spawnIdx = spawnTile(state);
  if (!canMove(state)) state.over = true;
  return { moved: true, gained };
}
