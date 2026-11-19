// Stockfish WASM bot (Web Worker) + built-in minimax alpha-beta fallback.
// The worker script is served from /public/engine/stockfish-19-lite-single.js
// and resolves its .wasm sibling automatically.

export const BOT_LEVELS = {
  beginner: { skill: 0, depth: 1, label: 'Beginner' },
  easy: { skill: 5, depth: 2, label: 'Easy' },
  medium: { skill: 10, depth: 2, label: 'Medium' },
  hard: { skill: 15, depth: 4, label: 'Hard' },
  master: { skill: 20, depth: 4, label: 'Master' }
};

let worker = null;
let readyPromise = null;
let readyResolve = null;
let pendingResolve = null;

function getWorker() {
  if (!worker) {
    worker = new Worker('/engine/stockfish-19-lite-single.js');
    worker.onmessage = (ev) => {
      const line = (typeof ev.data === 'string' ? ev.data : '').trim();
      if (!line) return;
      if (line.startsWith('readyok')) {
        if (readyResolve) { readyResolve(); readyResolve = null; }
        return;
      }
      const bm = line.match(/^bestmove (\S+)/);
      if (bm && pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        resolve(bm[1]);
      }
    };
    worker.postMessage('uci');
    worker.postMessage('isready');
  }
  return worker;
}

function ensureReady() {
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => { readyResolve = resolve; });
    getWorker();
  }
  return readyPromise;
}

function stopBot() {
  if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
  worker = null;
  readyPromise = null;
  readyResolve = null;
  pendingResolve = null;
}

function requestMove(fen, depth) {
  const w = getWorker();
  return new Promise((resolve) => {
    pendingResolve = resolve;
    w.postMessage('setoption name Skill Level value ' + depth.skill);
    w.postMessage('setoption name UCI_LimitStrength value true');
    w.postMessage('position fen ' + fen);
    w.postMessage('go depth ' + depth.depth);
  });
}

export async function getBotMove(fen, level) {
  const cfg = BOT_LEVELS[level] || BOT_LEVELS.medium;
  try {
    await ensureReady();
    const best = await requestMove(fen, cfg);
    const from = best.slice(0, 2);
    const to = best.slice(2, 4);
    const promotion = best.length > 4 ? best[4].toLowerCase() : 'q';
    return { from, to, promotion };
  } catch (e) {
    // Fallback: minimax alpha-beta (depth 2–4) over chess.js legal moves.
    return minimaxMove(fen, Math.max(2, cfg.depth));
  }
}

export function closeBot() {
  stopBot();
}

// ---- Minimax alpha-beta fallback (negamax) ----
import { Chess } from 'chess.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function negamax(chess, depth, alpha, beta) {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    return chess.inCheck() ? -100000 + depth : 0;
  }
  if (depth <= 0) {
    const board = chess.board();
    let score = 0;
    const perspective = chess.turn();
    for (const row of board) {
      for (const sq of row) {
        if (!sq || sq.type === 'k') continue;
        const v = VAL[sq.type] || 0;
        score += (sq.color === perspective ? 1 : -1) * v;
      }
    }
    return score;
  }
  let best = -Infinity;
  for (const m of moves) {
    chess.move(m.from + m.to + (m.promotion || ''));
    const score = -negamax(chess, depth - 1, -beta, -alpha);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function minimaxMove(fen, depth) {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (!moves.length) return null;
    let bestScore = -Infinity;
    let bestMove = moves[0];
    for (const m of moves) {
      chess.move(m.from + m.to + (m.promotion || ''));
      const score = -negamax(chess, depth - 1, -Infinity, Infinity);
      chess.undo();
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }
    return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion || 'q' };
  } catch (e) {
    return null;
  }
}
