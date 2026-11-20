'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import LeftRail, { BottomTabBar } from './LeftRail';
import { ChessPieceSvg } from './ChessPieceSvg';
import {
  playMove,
  playCapture,
  playCastle,
  playCheck,
  playGameStart,
  playGameOver,
  isSoundEnabled,
  setSoundEnabled,
} from '../lib/chessAudio';
import { getBotMove, closeBot, BOT_LEVELS } from '../lib/stockfishBot';
import { chessSocket, connectChess, emitChess, onChess } from '../lib/chessSocket';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Flag,
  ArrowLeftRight,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';

export const BOARD_THEMES = {
  emerald: {
    id: 'emerald',
    label: 'Classic Emerald',
    light: '#eeeed2',
    dark: '#769656',
    lastMove: 'rgba(247, 247, 105, 0.45)',
    selected: 'rgba(129, 201, 65, 0.55)',
  },
  walnut: {
    id: 'walnut',
    label: 'Warm Walnut',
    light: '#f0d9b5',
    dark: '#b58863',
    lastMove: 'rgba(205, 210, 106, 0.55)',
    selected: 'rgba(106, 176, 76, 0.65)',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean Breeze',
    light: '#dee3e6',
    dark: '#8ca2ad',
    lastMove: 'rgba(138, 198, 209, 0.55)',
    selected: 'rgba(92, 172, 238, 0.65)',
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Slate',
    light: '#e2e8f0',
    dark: '#475569',
    lastMove: 'rgba(250, 204, 21, 0.45)',
    selected: 'rgba(56, 189, 248, 0.55)',
  },
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PANEL_TABS = ['new', 'moves', 'info'];
const SETTINGS_KEY = 'gg:chess:settings';

const TIME_GROUPS = [
  { group: 'Bullet', items: [{ id: '1+0', label: '1+0', sec: 60, inc: 0 }, { id: '2+1', label: '2+1', sec: 120, inc: 1 }] },
  { group: 'Blitz', items: [{ id: '3+0', label: '3+0', sec: 180, inc: 0 }, { id: '5+0', label: '5+0', sec: 300, inc: 0 }] },
  { group: 'Rapid', items: [{ id: '10+0', label: '10+0', sec: 600, inc: 0 }, { id: '15+10', label: '15+10', sec: 900, inc: 10 }] },
  { group: 'Untimed', items: [{ id: 'untimed', label: 'Untimed', sec: null, inc: 0 }] },
];
const TIME_BY_ID = Object.fromEntries(TIME_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i])));

const MODES = [
  { id: 'bot', label: 'Play Bot', blurb: 'Challenge Stockfish AI', emoji: '🤖' },
  { id: 'pass', label: 'Pass & Play', blurb: 'Two players, one screen', emoji: '👥' },
  { id: 'online', label: 'Play a Friend', blurb: 'Room code, instant invite', emoji: '🌐' },
];

const DEFAULT_SETTINGS = {
  coords: true,
  legalHints: true,
  autoFlip: false,
  haptics: true,
  sound: true,
  boardTheme: 'emerald',
  showEval: true,
};

const REASONS = {
  checkmate: 'Checkmate',
  resign: 'Resignation',
  timeout: 'Time expired',
  stalemate: 'Stalemate',
  repetition: 'Threefold repetition',
  material: 'Insufficient material',
  'fifty-move': 'Fifty-move rule',
  agreement: 'Draw by agreement',
  draw: 'Draw',
};

const PIECE_VAL = { p: 1, n: 3.1, b: 3.25, r: 5, q: 9, k: 0 };

function kingSquare(chess, color) {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.type === 'k' && sq.color === color) return 'abcdefgh'[c] + (8 - r);
    }
  }
  return null;
}

function deriveResult(g) {
  if (g.isCheckmate()) return { winner: g.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' };
  if (g.isStalemate()) return { winner: 'd', reason: 'stalemate' };
  if (g.isThreefoldRepetition()) return { winner: 'd', reason: 'repetition' };
  if (g.isInsufficientMaterial()) return { winner: 'd', reason: 'material' };
  if (g.isDraw()) return { winner: 'd', reason: 'fifty-move' };
  return { winner: 'd', reason: 'draw' };
}

function fmtClock(ms) {
  if (ms === null || ms === undefined) return '—';
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function resultLabel(r) {
  if (!r) return '';
  if (r.winner === 'd') return 'Draw';
  return `${r.winner === 'w' ? 'White' : 'Black'} wins`;
}

function Modal({ children, onClose, labelledBy }) {
  return (
    <div
      className="gg-modal-in fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-modal border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CapturedPieceGroup({ pieces, color }) {
  if (!pieces || pieces.length === 0) return null;
  const counts = pieces.reduce((acc, p) => {
    acc[p.t] = (acc[p.t] || 0) + 1;
    return acc;
  }, {});
  const order = ['q', 'r', 'b', 'n', 'p'];

  return (
    <div className="flex items-center gap-1.5 overflow-hidden">
      {order.map((t) => {
        const qty = counts[t];
        if (!qty) return null;
        return (
          <div key={t} className="flex items-center" title={`${qty}x ${t.toUpperCase()}`}>
            <div className="h-5 w-5 shrink-0">
              <ChessPieceSvg type={t} color={color} />
            </div>
            {qty > 1 && (
              <span className="text-[10px] font-bold text-muted -ml-0.5">×{qty}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayerBar({ name, avatar, clock, low, capturedPieces, capturedColor, lead, sub, active }) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 transition-all duration-200 border ${
        active
          ? 'border-accent/70 bg-surface shadow-sm ring-1 ring-accent/30'
          : 'border-border/60 bg-surface/90'
      }`}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface2 text-xl shadow-inner" aria-hidden="true">
        {avatar}
        {active && (
          <span className="gg-turn-dot absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold tracking-tight">{name}</span>
          {active && <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Turn</span>}
        </div>
        <span className="truncate text-xs text-muted">{sub}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CapturedPieceGroup pieces={capturedPieces} color={capturedColor} />
        {lead > 0 && (
          <span className="rounded-card bg-surface2 px-1.5 py-0.5 text-xs font-bold text-accent">
            +{lead}
          </span>
        )}
      </div>

      <span
        className={`ml-2 min-w-[62px] rounded-pill px-2.5 py-1 text-right text-sm font-bold font-mono tabular-nums transition-colors ${
          low
            ? 'animate-pulse bg-danger text-white shadow-sm'
            : active
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'bg-surface2 text-text'
        }`}
      >
        {clock}
      </span>
    </div>
  );
}

function AdvantageGauge({ score, flipped }) {
  const clamped = Math.max(-10, Math.min(10, score));
  const whitePct = 50 + (clamped / 10) * 45;
  const fillPct = flipped ? 100 - whitePct : whitePct;
  const displayScore = Math.abs(score) < 0.1 ? '0.0' : (score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1));

  return (
    <div
      className="relative flex w-2.5 sm:w-3.5 h-full shrink-0 flex-col overflow-hidden rounded-full border border-border/80 bg-[#262421] shadow-inner select-none"
      title={`Advantage: ${displayScore} (White ${displayScore.startsWith('+') ? displayScore : score === 0 ? 'even' : displayScore})`}
    >
      <div
        className="w-full bg-[#f6f5f2] transition-all duration-300 ease-out"
        style={{
          height: `${fillPct}%`,
          marginTop: 'auto',
        }}
      />
      <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-red-500/70 pointer-events-none" />
    </div>
  );
}

export function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [view, setView] = useState('play');
  const [theme, setTheme] = useState('dark');
  const [collapsed, setCollapsed] = useState(false);
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [drag, setDrag] = useState(null);
  const [capturedFx, setCapturedFx] = useState(null);
  const [animatingMove, setAnimatingMove] = useState(null);
  const [animatingRook, setAnimatingRook] = useState(null);
  const [moveIdx, setMoveIdx] = useState(-1);
  const [sans, setSans] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [botLevel, setBotLevel] = useState('medium');
  const [panelTab, setPanelTab] = useState('new');
  const [clockMs, setClockMs] = useState({ w: null, b: null });
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('bot');
  const [colorChoice, setColorChoice] = useState('w');
  const [humanColor, setHumanColor] = useState('w');
  const [timeControl, setTimeControl] = useState('10+0');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [drawOffer, setDrawOffer] = useState(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [onlineNote, setOnlineNote] = useState('');

  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const fensRef = useRef([START_FEN]);
  const roomRef = useRef(null);
  const autoJoinRef = useRef(null);
  const movesEndRef = useRef(null);

  // Sync sound setting
  useEffect(() => {
    setSoundEnabled(settings.sound);
  }, [settings.sound]);

  // Load theme & settings from localStorage
  useEffect(() => {
    let t = 'dark';
    try {
      const stored = localStorage.getItem('gg:theme');
      if (stored === 'light' || stored === 'dark') t = stored;
      else t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      t = 'dark';
    }
    setTheme(t);
    document.documentElement.dataset.theme = t;
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings((s) => ({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }));
    } catch (e) {}
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) {
      setMode('online');
      setJoinCode(code.toUpperCase());
      autoJoinRef.current = code.toUpperCase();
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Auto-scroll moves list
  useEffect(() => {
    if (panelTab === 'moves') {
      movesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sans.length, moveIdx, panelTab]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('gg:theme', next);
    } catch (e) {}
    document.documentElement.dataset.theme = next;
  };

  const handleSelect = (id) => {
    if (id === 'play') setView('play');
    else if (id === 'settings') setView('settings');
  };

  const targets = useMemo(() => {
    const s = selected;
    if (!s) return new Set();
    const moves = game.moves({ verbose: true }).filter((m) => m.from === s);
    return new Set(moves.map((m) => m.to));
  }, [game, selected]);

  const moveHistory = game.history({ verbose: true });
  const lastMove = moveHistory.length ? moveHistory[moveHistory.length - 1] : null;
  const checkSq = game.inCheck() ? kingSquare(game, game.turn()) : null;
  const gameOver = started && (game.isGameOver() || !!result);
  const isPassPlay = mode === 'pass';
  const canPlayTurn = isPassPlay ? true : game.turn() === humanColor;
  const interactive = started && !pendingPromo && !gameOver && view === 'play' && canPlayTurn && !drawOffer;

  const currentBoardTheme = BOARD_THEMES[settings.boardTheme] || BOARD_THEMES.emerald;

  const applyMoveObj = (move) => {
    if (mode === 'online') {
      emitChess('move', {
        roomId: roomRef.current,
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
      return;
    }

    const ok = game.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!ok) return;

    // Trigger Audio Sound Effect
    if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
      playCastle();
    } else if (game.inCheck()) {
      playCheck();
    } else if (move.captured) {
      playCapture();
    } else {
      playMove();
    }

    // Calculate smooth slide animation deltas
    const fromCol = flipped ? 7 - (move.from.charCodeAt(0) - 97) : move.from.charCodeAt(0) - 97;
    const fromRow = flipped ? move.from.charCodeAt(1) - 49 : 8 - (move.from.charCodeAt(1) - 48);
    const toCol = flipped ? 7 - (move.to.charCodeAt(0) - 97) : move.to.charCodeAt(0) - 97;
    const toRow = flipped ? move.to.charCodeAt(1) - 49 : 8 - (move.to.charCodeAt(1) - 48);
    const dx = (fromCol - toCol) * 100;
    const dy = (fromRow - toRow) * 100;

    setAnimatingMove({
      to: move.to,
      from: move.from,
      dx,
      dy,
    });

    // Animate rook if castling
    if (move.flags && move.flags.includes('k')) {
      const rookFrom = move.color === 'w' ? 'h1' : 'h8';
      const rookTo = move.color === 'w' ? 'f1' : 'f8';
      const rFromC = flipped ? 7 - (rookFrom.charCodeAt(0) - 97) : rookFrom.charCodeAt(0) - 97;
      const rFromR = flipped ? rookFrom.charCodeAt(1) - 49 : 8 - (rookFrom.charCodeAt(1) - 48);
      const rToC = flipped ? 7 - (rookTo.charCodeAt(0) - 97) : rookTo.charCodeAt(0) - 97;
      const rToR = flipped ? rookTo.charCodeAt(1) - 49 : 8 - (rookTo.charCodeAt(1) - 48);
      setAnimatingRook({
        to: rookTo,
        dx: (rFromC - rToC) * 100,
        dy: (rFromR - rToR) * 100,
      });
    } else if (move.flags && move.flags.includes('q')) {
      const rookFrom = move.color === 'w' ? 'a1' : 'a8';
      const rookTo = move.color === 'w' ? 'd1' : 'd8';
      const rFromC = flipped ? 7 - (rookFrom.charCodeAt(0) - 97) : rookFrom.charCodeAt(0) - 97;
      const rFromR = flipped ? rookFrom.charCodeAt(1) - 49 : 8 - (rookFrom.charCodeAt(1) - 48);
      const rToC = flipped ? 7 - (rookTo.charCodeAt(0) - 97) : rookTo.charCodeAt(0) - 97;
      const rToR = flipped ? rookTo.charCodeAt(1) - 49 : 8 - (rookTo.charCodeAt(1) - 48);
      setAnimatingRook({
        to: rookTo,
        dx: (rFromC - rToC) * 100,
        dy: (rFromR - rToR) * 100,
      });
    } else {
      setAnimatingRook(null);
    }

    window.setTimeout(() => {
      setAnimatingMove(null);
      setAnimatingRook(null);
    }, 200);

    fensRef.current.push(game.fen());
    setSans((p) => [...p, move.san]);
    setMoveCount((c) => c + 1);
    setSelected(null);
    setMoveIdx(-1);

    const inc = (TIME_BY_ID[timeControl]?.inc || 0) * 1000;
    if (inc) setClockMs((c) => ({ ...c, [move.color]: (c[move.color] ?? 0) + inc }));

    if (move.captured) {
      setCapturedFx({ sq: move.to });
      window.setTimeout(() => setCapturedFx(null), 280);
    }

    if (settings.haptics) {
      try {
        navigator.vibrate?.(12);
      } catch (e) {}
    }

    if (isPassPlay && settings.autoFlip) setFlipped((f) => !f);
  };

  const attemptMove = (from, to) => {
    const move = game.moves({ verbose: true }).find((m) => m.from === from && m.to === to);
    if (!move) return;
    if (move.promotion) {
      setPendingPromo({ from, to });
      setSelected(null);
      return;
    }
    applyMoveObj(move);
  };

  const choosePromotion = (piece) => {
    if (!pendingPromo) return;
    const move = game.moves({ verbose: true }).find((m) => m.from === pendingPromo.from && m.to === pendingPromo.to);
    setPendingPromo(null);
    if (move) applyMoveObj({ ...move, promotion: piece });
  };

  const sqFromPoint = (x, y) => {
    const el = boardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const col = Math.floor(((x - r.left) / r.width) * 8);
    const row = Math.floor(((y - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const c = flipped ? 7 - col : col;
    const rank = flipped ? row + 1 : 8 - row;
    return 'abcdefgh'[c] + rank;
  };

  const handleSquareDown = (e, sq) => {
    if (!interactive) return;
    if (selected && targets.has(sq)) {
      attemptMove(selected, sq);
      return;
    }
    const p = game.get(sq);
    if (p && p.color === game.turn()) {
      setSelected(sq);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch (err) {}
      dragRef.current = {
        from: sq,
        pointerId: e.pointerId,
        targetEl: e.currentTarget,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      };
      setDrag({ from: sq, x: e.clientX, y: e.clientY });
    } else {
      setSelected(null);
    }
  };

  const handleBoardMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5;
    dragRef.current = { ...d, x: e.clientX, y: e.clientY, moved };
    setDrag({ from: d.from, x: e.clientX, y: e.clientY, moved });
  };

  const handleBoardUp = (e) => {
    const d = dragRef.current;
    if (!d) return;
    try {
      d.targetEl?.releasePointerCapture?.(d.pointerId);
    } catch (err) {}
    dragRef.current = null;
    const wasMoving = d.moved;
    setDrag(null);
    if (wasMoving) {
      const sq = sqFromPoint(e.clientX, e.clientY);
      if (sq && sq !== d.from) attemptMove(d.from, sq);
    }
  };

  const jumpToPly = (ply) => {
    const fen = fensRef.current[ply];
    if (!fen) return;
    game.load(fen);
    setMoveIdx(ply);
    setSelected(null);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (pendingPromo) {
        if (e.key === 'Escape') setPendingPromo(null);
        return;
      }
      if (e.key === 'Escape') {
        setSelected(null);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        setFlipped((f) => !f);
        return;
      }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const lastIdx = fensRef.current.length - 1;
        const cur = moveIdx === -1 ? lastIdx : moveIdx;
        let next = moveIdx;
        if (e.key === 'ArrowUp') next = 0;
        else if (e.key === 'ArrowDown') next = lastIdx;
        else if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
        else if (e.key === 'ArrowRight') next = Math.min(lastIdx, cur + 1);
        setMoveIdx(next);
        if (next !== -1) {
          game.load(fensRef.current[next]);
          setSelected(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => () => closeBot(), []);

  // Bot Turn Handler
  useEffect(() => {
    if (mode !== 'bot' || !started || pendingPromo || gameOver) return;
    if (game.turn() === humanColor) return;
    let cancelled = false;
    getBotMove(game.fen(), botLevel).then((m) => {
      if (cancelled || !m) return;
      attemptMove(m.from, m.to);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, game, started, pendingPromo, gameOver, botLevel, moveCount, humanColor]);

  // Clock countdown timer
  useEffect(() => {
    if (!started || gameOver || mode === 'online') return;
    const id = window.setInterval(() => {
      setClockMs((c) => {
        const t = game.turn();
        if (c[t] === null || c[t] === undefined) return c;
        const next = Math.max(0, c[t] - 1000);
        if (next === 0) {
          window.setTimeout(
            () => {
              playGameOver();
              setResult({ winner: t === 'w' ? 'b' : 'w', reason: 'timeout' });
            },
            0
          );
        }
        return { ...c, [t]: next };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, gameOver, mode, game]);

  // Game over detection
  useEffect(() => {
    if (!started || result || !game.isGameOver()) return;
    const r = deriveResult(game);
    setResult(r);
    playGameOver();
  }, [started, result, moveCount, game]);

  useEffect(() => {
    if (!result) return;
    setShowResult(true);
  }, [result]);

  const applyOnlineState = (st) => {
    if (!st) return;
    try {
      const g = new Chess();
      if (st.fen) g.load(st.fen);
      setGame(g);
    } catch (e) {}
    try {
      const g = new Chess();
      if (st.pgn) g.loadPgn(st.pgn);
      const hist = g.history({ verbose: true });
      setSans(hist.map((m) => m.san));
      const replay = new Chess();
      const fens = [replay.fen()];
      hist.forEach((m) => {
        replay.move(m);
        fens.push(replay.fen());
      });
      fensRef.current = fens;
      setMoveCount((c) => c + 1);
      setMoveIdx(-1);
    } catch (e) {}
    if (st.clocks) {
      const toMs = (v) => (v === null || v === undefined ? null : v * 1000);
      setClockMs({ w: toMs(st.clocks.w), b: toMs(st.clocks.b) });
    }
    if (chessSocket && st.seats) {
      setHumanColor(st.seats.w === chessSocket.id ? 'w' : 'b');
    }
    if (st.status && st.status !== 'playing') {
      setResult({ winner: st.winner || 'd', reason: st.reason || 'draw' });
      playGameOver();
    }
  };

  useEffect(() => {
    if (mode !== 'online') return;
    connectChess();
    const offs = [
      onChess('connect', () => {
        setOnlineNote('');
        if (autoJoinRef.current) {
          emitChess('room:join', { roomId: autoJoinRef.current });
          autoJoinRef.current = null;
        }
      }),
      onChess('room:created', (p) => {
        const link = window.location.origin + '/games/chess-queen?room=' + p.roomId;
        roomRef.current = p.roomId;
        setRoom({ id: p.roomId, link });
        setOnlineNote('Waiting for your friend to join…');
        applyOnlineState(p.state);
        setStarted(true);
        setPanelTab('moves');
        playGameStart();
      }),
      onChess('room:joined', (p) => {
        const link = window.location.origin + '/games/chess-queen?room=' + p.roomId;
        roomRef.current = p.roomId;
        setRoom({ id: p.roomId, link });
        setOnlineNote('');
        applyOnlineState(p.state);
        setStarted(true);
        setPanelTab('moves');
        playGameStart();
      }),
      onChess('state', (st) => applyOnlineState(st)),
      onChess('error', (e) => setOnlineNote((e && e.message) || 'Online error')),
      onChess('draw:offer', () => setDrawOffer({ from: 'them' })),
      onChess('draw:declined', () => setDrawOffer(null)),
      onChess('draw:accepted', () => {
        setDrawOffer(null);
        setResult({ winner: 'd', reason: 'agreement' });
        playGameOver();
      }),
      onChess('rematch:offer', () => setDrawOffer({ from: 'rematch' })),
      onChess('rematch:accepted', () => {
        setDrawOffer(null);
        setResult(null);
        setShowResult(false);
        setStarted(true);
        playGameStart();
      }),
      onChess('disconnect', () => setOnlineNote('Opponent disconnected, waiting…')),
    ];
    return () => offs.forEach((off) => off());
  }, [mode]);

  const resetGame = (start) => {
    setGame(new Chess());
    fensRef.current = [START_FEN];
    setSans([]);
    setMoveCount(0);
    setMoveIdx(-1);
    setResult(null);
    setDrawOffer(null);
    setSelected(null);
    setPendingPromo(null);
    setShowResult(false);
    setStarted(!!start);
    if (start) playGameStart();
  };

  const startGame = () => {
    const tc = TIME_BY_ID[timeControl] || TIME_BY_ID['10+0'];
    const resolved = isPassPlay ? 'w' : colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;
    setHumanColor(resolved);
    setClockMs({ w: tc.sec === null ? null : tc.sec * 1000, b: tc.sec === null ? null : tc.sec * 1000 });
    resetGame(true);
    setFlipped(!isPassPlay && resolved === 'b');
    setPanelTab('moves');
  };

  const newGame = () => {
    resetGame(false);
    setPanelTab('new');
    setSheetOpen(false);
  };

  const rematch = () => {
    if (mode === 'online') {
      emitChess('rematch:offer', { roomId: roomRef.current });
      setOnlineNote('Rematch offered — waiting for your friend…');
      setShowResult(false);
      return;
    }
    resetGame(true);
  };

  const doResign = () => {
    setConfirmResign(false);
    if (mode === 'online') emitChess('resign', { roomId: roomRef.current });
    setResult({ winner: humanColor === 'w' ? 'b' : 'w', reason: 'resign' });
    playGameOver();
  };

  const offerDraw = () => {
    if (mode === 'online') {
      emitChess('draw:offer', { roomId: roomRef.current });
      setOnlineNote('Draw offered to your friend…');
      return;
    }
    if (mode === 'bot') {
      setDrawOffer({ from: 'bot' });
      return;
    }
    setDrawOffer({ from: 'me' });
  };

  const acceptDraw = () => {
    if (mode === 'online') emitChess('draw:response', { roomId: roomRef.current, accept: true });
    setDrawOffer(null);
    setResult({ winner: 'd', reason: 'agreement' });
    playGameOver();
  };

  const declineDraw = () => {
    if (mode === 'online') emitChess('draw:response', { roomId: roomRef.current, accept: false });
    setDrawOffer(null);
  };

  const createRoom = () => {
    setOnlineNote('');
    connectChess();
    emitChess('room:create', { timeControlId: timeControl, playerColor: colorChoice === 'b' ? 'b' : 'w' });
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setOnlineNote('Room codes are 6 characters');
      return;
    }
    setOnlineNote('');
    connectChess();
    emitChess('room:join', { roomId: code });
  };

  const status = !started
    ? 'White to move — press Start'
    : result
      ? resultLabel(result)
      : game.turn() === 'w'
        ? 'White to move'
        : 'Black to move';

  const movePairs = [];
  for (let i = 0; i + 1 < sans.length; i += 2) movePairs.push([sans[i], sans[i + 1]]);
  if (sans.length % 2 === 1) movePairs.push([sans[sans.length - 1], null]);

  // Accurate captured pieces calculation
  const capturedLists = useMemo(() => {
    const boardArr = game.board();
    const startQty = { w: { p: 8, n: 2, b: 2, r: 2, q: 1 }, b: { p: 8, n: 2, b: 2, r: 2, q: 1 } };
    const missing = (color) => {
      const on = { p: 0, n: 0, b: 0, r: 0, q: 0 };
      for (const row of boardArr) {
        for (const sq of row) {
          if (sq && sq.color === color) on[sq.type] += 1;
        }
      }
      const out = [];
      for (const t of ['q', 'r', 'b', 'n', 'p']) {
        const cap = startQty[color][t] - on[t];
        for (let i = 0; i < cap; i++) out.push({ t });
      }
      return out;
    };
    // Pieces lost by Black (captured by White)
    const byWhite = missing('b');
    // Pieces lost by White (captured by Black)
    const byBlack = missing('w');
    const val = (l) => l.reduce((s, p) => s + (PIECE_VAL[p.t] || 0), 0);
    const whiteVal = val(byWhite);
    const blackVal = val(byBlack);
    return {
      byWhite,
      byBlack,
      whiteVal,
      blackVal,
      diffW: Math.round((whiteVal - blackVal) * 10) / 10,
    };
  }, [game, moveCount]);

  // Construct Board Squares and Pieces
  const boardSquares = [];
  const boardPieces = [];
  {
    const arr = game.board();
    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const r = flipped ? 7 - dr : dr;
        const c = flipped ? 7 - dc : dc;
        const piece = arr[r][c];
        const rank = 8 - r;
        const fileChar = 'abcdefgh'[c];
        const sq = fileChar + rank;
        const isLight = (c + rank) % 2 === 0;

        let bg = isLight ? currentBoardTheme.light : currentBoardTheme.dark;
        let isCheck = false;
        let isSelected = false;
        let isLastMove = false;

        if (selected && sq === selected) {
          bg = currentBoardTheme.selected;
          isSelected = true;
        } else if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
          bg = currentBoardTheme.lastMove;
          isLastMove = true;
        } else if (checkSq && sq === checkSq) {
          isCheck = true;
        }

        const targetMove =
          selected && targets.has(sq)
            ? game.moves({ verbose: true }).find((m) => m.from === selected && m.to === sq)
            : null;

        const isHoverDrop = drag && sqFromPoint(drag.x, drag.y) === sq && targets.has(sq);

        boardSquares.push(
          <div
            key={sq}
            className={`relative flex items-center justify-center transition-colors duration-150 ${
              isCheck ? 'gg-check-pulse' : ''
            }`}
            style={{
              backgroundColor: bg,
              boxShadow: isSelected ? 'inset 0 0 0 2px rgba(255,255,255,0.4)' : undefined,
            }}
            onPointerDown={(e) => handleSquareDown(e, sq)}
          >
            {/* Capture Flash Effect */}
            {capturedFx && capturedFx.sq === sq && (
              <div className="gg-capture-flash pointer-events-none absolute inset-0 rounded-full bg-danger/30" />
            )}

            {/* Legal Move Indicators */}
            {settings.legalHints && targetMove && (
              <div
                className="pointer-events-none absolute flex items-center justify-center transition-transform"
                style={
                  targetMove.captured
                    ? {
                        inset: '8%',
                        border: '4px solid rgba(0,0,0,0.3)',
                        borderRadius: '50%',
                      }
                    : {
                        width: '28%',
                        height: '28%',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.25)',
                      }
                }
              />
            )}

            {/* Drag drop target highlight */}
            {isHoverDrop && (
              <div className="pointer-events-none absolute inset-1 rounded-card border-2 border-accent bg-accent/20" />
            )}

            {/* Board Coordinates */}
            {settings.coords && (
              <>
                {dr === 7 && (
                  <span
                    className={`pointer-events-none absolute bottom-0.5 right-1 text-[10px] font-bold select-none ${
                      isLight ? 'text-black/45' : 'text-white/60'
                    }`}
                  >
                    {fileChar}
                  </span>
                )}
                {dc === 0 && (
                  <span
                    className={`pointer-events-none absolute left-1 top-0.5 text-[10px] font-bold select-none ${
                      isLight ? 'text-black/45' : 'text-white/60'
                    }`}
                  >
                    {rank}
                  </span>
                )}
              </>
            )}
          </div>
        );

        if (piece && !(drag && drag.from === sq)) {
          const isAnimatingThis = animatingMove && animatingMove.to === sq;
          const isAnimatingCastleRook = animatingRook && animatingRook.to === sq;
          const slideX = isAnimatingThis ? animatingMove.dx : isAnimatingCastleRook ? animatingRook.dx : 0;
          const slideY = isAnimatingThis ? animatingMove.dy : isAnimatingCastleRook ? animatingRook.dy : 0;
          const isSliding = isAnimatingThis || isAnimatingCastleRook;

          boardPieces.push(
            <div
              key={'piece-' + sq}
              className={`pointer-events-none absolute flex items-center justify-center p-[1.5%] select-none ${
                isSliding ? 'gg-piece-slide' : ''
              }`}
              style={{
                left: `${dc * 12.5}%`,
                top: `${dr * 12.5}%`,
                width: '12.5%',
                height: '12.5%',
                '--slide-x': `${slideX}%`,
                '--slide-y': `${slideY}%`,
              }}
            >
              <ChessPieceSvg type={piece.type} color={piece.color} />
            </div>
          );
        }
      }
    }
  }

  const opponentColor = isPassPlay ? (flipped ? 'w' : 'b') : humanColor === 'w' ? 'b' : 'w';
  const playerColor = isPassPlay ? (flipped ? 'b' : 'w') : humanColor;
  const botColor = humanColor === 'w' ? 'b' : 'w';

  const barFor = (color, who) => {
    // Pieces captured by this color
    const captured = color === 'w' ? capturedLists.byWhite : capturedLists.byBlack;
    // The piece color to render (captured opponent's pieces)
    const pieceColorToRender = color === 'w' ? 'b' : 'w';
    const lead = color === 'w' ? capturedLists.diffW : -capturedLists.diffW;
    const clock = color === 'w' ? clockMs.w : clockMs.b;
    const active = started && !gameOver && game.turn() === color;

    let name = who;
    let avatar = '😎';
    let sub = 'Human Player';

    if (mode === 'bot') {
      if (color === botColor) {
        name = 'GG Bot';
        avatar = '🤖';
        sub = `${BOT_LEVELS[botLevel].label} Engine`;
      } else {
        name = 'You';
        avatar = '😎';
        sub = 'Player';
      }
    } else if (mode === 'pass') {
      name = color === 'w' ? 'White' : 'Black';
      avatar = color === 'w' ? '♔' : '♚';
      sub = 'Local Turn';
    } else {
      if (color === opponentColor) {
        name = 'Opponent';
        avatar = '🌐';
        sub = 'Online Player';
      } else {
        name = 'You';
        avatar = '😎';
        sub = 'Player';
      }
    }

    return (
      <PlayerBar
        key={color}
        name={name}
        avatar={avatar}
        sub={sub}
        clock={fmtClock(clock)}
        low={active && clock !== null && clock < 15000}
        capturedPieces={captured}
        capturedColor={pieceColorToRender}
        lead={lead}
        active={active}
      />
    );
  };

  const newGameTab = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Game Mode</p>
        <div className="grid grid-cols-1 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`flex items-center gap-3 rounded-card px-3.5 py-2.5 text-left transition-all ${
                mode === m.id
                  ? 'bg-accent text-white shadow-sm ring-2 ring-accent/30 font-bold'
                  : 'bg-surface2 text-text hover:bg-surface2/80'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">{m.emoji}</span>
              <span className="flex flex-col">
                <span className="text-sm font-bold">{m.label}</span>
                <span className={`text-xs ${mode === m.id ? 'text-white/80' : 'text-muted'}`}>{m.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'bot' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Stockfish Bot Level</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.keys(BOT_LEVELS).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setBotLevel(k)}
                aria-pressed={botLevel === k}
                className={`rounded-card py-2 text-xs font-bold transition-all ${
                  botLevel === k
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface2 text-text hover:bg-surface2/80'
                }`}
              >
                {BOT_LEVELS[k].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Time Control</p>
        <div className="flex flex-col gap-2">
          {TIME_GROUPS.map((grp) => (
            <div key={grp.group} className="flex items-center gap-2">
              <span className="w-14 text-xs font-semibold text-muted">{grp.group}</span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {grp.items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeControl(t.id)}
                    aria-pressed={timeControl === t.id}
                    className={`rounded-card px-3 py-1.5 text-xs font-bold transition-all ${
                      timeControl === t.id
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-surface2 text-text hover:bg-surface2/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isPassPlay && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Play As</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'w', label: 'White', piece: 'k', color: 'w' },
              { id: 'random', label: 'Random', emoji: '🎲' },
              { id: 'b', label: 'Black', piece: 'k', color: 'b' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorChoice(c.id)}
                aria-pressed={colorChoice === c.id}
                className={`flex items-center justify-center gap-2 rounded-card px-3 py-2 text-sm font-bold transition-all ${
                  colorChoice === c.id
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface2 text-text hover:bg-surface2/80'
                }`}
              >
                {c.piece ? (
                  <div className="h-5 w-5">
                    <ChessPieceSvg type={c.piece} color={c.color} />
                  </div>
                ) : (
                  <span>{c.emoji}</span>
                )}
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isPassPlay && (
        <label className="flex items-center justify-between rounded-card bg-surface2 px-3 py-2.5 text-sm font-semibold cursor-pointer">
          <span>Auto-flip board on move</span>
          <input
            type="checkbox"
            checked={settings.autoFlip}
            onChange={(e) => setSettings((s) => ({ ...s, autoFlip: e.target.checked }))}
            className="h-5 w-5 accent-[var(--gg-accent)] rounded cursor-pointer"
          />
        </label>
      )}

      {mode === 'online' ? (
        <div className="flex flex-col gap-3 rounded-card bg-surface2 p-3.5 border border-border">
          {room ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Room Code</p>
              <p className="rounded-card bg-bg px-3 py-2.5 text-center text-3xl font-black tracking-[0.35em] text-accent font-mono">
                {room.id}
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(room.link)}
                className="rounded-pill border border-border bg-surface px-4 py-2 text-sm font-bold hover:bg-surface2 transition-colors"
              >
                Copy Invite Link
              </button>
              <p className="text-xs text-muted text-center">{onlineNote}</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={createRoom}
                className="rounded-pill bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95 active:scale-98 transition-all"
              >
                Create Room
              </button>
              <div className="flex items-center gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="CODE"
                  aria-label="Room code"
                  className="min-w-0 flex-1 rounded-card bg-bg px-3 py-2 text-center text-sm font-bold uppercase tracking-widest border border-border"
                />
                <button
                  type="button"
                  onClick={joinRoom}
                  className="rounded-pill bg-surface px-4 py-2 text-sm font-bold border border-border hover:bg-surface2 transition-colors"
                >
                  Join
                </button>
              </div>
              {onlineNote && <p className="text-xs text-muted">{onlineNote}</p>}
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={startGame}
          className="rounded-pill bg-accent px-6 py-3 text-base font-bold text-white shadow-md hover:opacity-95 active:scale-98 transition-all"
        >
          Start
        </button>
      )}
    </div>
  );

  const movesTab = (
    <div className="flex flex-col gap-4">
      {/* History Navigation Controls */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => jumpToPly(0)}
          aria-label="First move"
          className="flex items-center justify-center rounded-card bg-surface2 py-2 text-sm font-bold hover:bg-surface2/80 transition-colors"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            const lastIdx = fensRef.current.length - 1;
            const cur = moveIdx === -1 ? lastIdx : moveIdx;
            jumpToPly(Math.max(0, cur - 1));
          }}
          aria-label="Previous move"
          className="flex items-center justify-center rounded-card bg-surface2 py-2 text-sm font-bold hover:bg-surface2/80 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            const lastIdx = fensRef.current.length - 1;
            const cur = moveIdx === -1 ? lastIdx : moveIdx;
            jumpToPly(Math.min(lastIdx, cur + 1));
          }}
          aria-label="Next move"
          className="flex items-center justify-center rounded-card bg-surface2 py-2 text-sm font-bold hover:bg-surface2/80 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => jumpToPly(fensRef.current.length - 1)}
          aria-label="Last move"
          className="flex items-center justify-center rounded-card bg-surface2 py-2 text-sm font-bold hover:bg-surface2/80 transition-colors"
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* Move list */}
      <div className="max-h-[360px] min-h-[160px] overflow-y-auto pr-1">
        {movePairs.length > 0 ? (
          <div className="flex flex-col gap-1 text-sm font-mono">
            {movePairs.map((pair, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 rounded-card px-2 py-1 ${
                  i % 2 === 1 ? 'bg-surface2/40' : 'bg-transparent'
                }`}
              >
                <span className="w-8 text-right text-xs text-muted select-none">{i + 1}.</span>
                <button
                  type="button"
                  onClick={() => jumpToPly(2 * i + 1)}
                  className={`flex-1 rounded px-2.5 py-1 text-left font-bold transition-colors ${
                    moveIdx === 2 * i + 1
                      ? 'bg-accent text-white shadow-xs'
                      : 'hover:bg-surface2 text-text'
                  }`}
                >
                  {pair[0]}
                </button>
                {pair[1] ? (
                  <button
                    type="button"
                    onClick={() => jumpToPly(2 * i + 2)}
                    className={`flex-1 rounded px-2.5 py-1 text-left font-bold transition-colors ${
                      moveIdx === 2 * i + 2
                        ? 'bg-accent text-white shadow-xs'
                        : 'hover:bg-surface2 text-text'
                    }`}
                  >
                    {pair[1]}
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            ))}
            <div ref={movesEndRef} />
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center text-sm text-muted">
            Moves will appear here as you play.
          </div>
        )}
      </div>

      {/* In-game action buttons */}
      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={offerDraw}
          disabled={!started || gameOver}
          className="flex items-center justify-center gap-1.5 rounded-card bg-surface2 px-3 py-2 text-sm font-bold transition-colors hover:bg-surface2/80 disabled:opacity-40"
        >
          <span>Draw ½</span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmResign(true)}
          disabled={!started || gameOver}
          className="flex items-center justify-center gap-1.5 rounded-card bg-surface2 px-3 py-2 text-sm font-bold text-danger transition-colors hover:bg-surface2/80 disabled:opacity-40"
        >
          <span>Resign ⚑</span>
        </button>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="flex items-center justify-center gap-1.5 rounded-card bg-surface2 px-3 py-2 text-sm font-bold transition-colors hover:bg-surface2/80"
        >
          <ArrowLeftRight size={14} />
          <span>Flip ⇅</span>
        </button>
        <button
          type="button"
          onClick={rematch}
          disabled={!started}
          className="flex items-center justify-center gap-1.5 rounded-card bg-surface2 px-3 py-2 text-sm font-bold transition-colors hover:bg-surface2/80 disabled:opacity-40"
        >
          <RotateCcw size={14} />
          <span>Rematch</span>
        </button>
      </div>
    </div>
  );

  const infoTab = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 rounded-card bg-surface2 p-3.5 text-sm border border-border">
        <p className="font-bold text-base">{status}</p>
        <p className="text-xs text-muted">
          {MODES.find((m) => m.id === mode)?.label} · {TIME_BY_ID[timeControl]?.label}
        </p>
        {result && <p className="text-xs font-semibold text-accent">{REASONS[result.reason] || result.reason}</p>}
        {room && <p className="text-xs text-muted">Online Room {room.id}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(game.fen())}
          className="rounded-card bg-surface2 px-3 py-2 text-xs font-bold hover:bg-surface2/80 transition-colors"
        >
          Copy FEN
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(game.pgn())}
          className="rounded-card bg-surface2 px-3 py-2 text-xs font-bold hover:bg-surface2/80 transition-colors"
        >
          Copy PGN
        </button>
      </div>
    </div>
  );

  const panelNode = (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border" role="tablist" aria-label="Game panel">
        {PANEL_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={panelTab === t}
            onClick={() => setPanelTab(t)}
            className={`flex-1 px-3 py-3 text-sm font-bold transition-colors ${
              panelTab === t
                ? 'bg-surface2 text-accent border-b-2 border-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            {t === 'new' ? 'New Game' : t === 'moves' ? 'Moves' : 'Info'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {panelTab === 'new' && newGameTab}
        {panelTab === 'moves' && movesTab}
        {panelTab === 'info' && infoTab}
      </div>
    </div>
  );

  const playView = (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-text select-none">
      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col justify-center px-3 py-4 md:py-6">
        {/* Draw Offer Notification */}
        {drawOffer && (
          <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-2 rounded-card border border-accent/60 bg-surface2 px-4 py-2.5 shadow-sm">
            <span className="text-sm font-bold">
              {drawOffer.from === 'rematch'
                ? 'Opponent wants a rematch'
                : drawOffer.from === 'them'
                  ? 'Opponent offers a draw'
                  : drawOffer.from === 'bot'
                    ? 'Bot accepts a draw'
                    : 'You offered a draw'}
            </span>
            <div className="flex items-center gap-2">
              {drawOffer.from === 'rematch' ? (
                <button
                  type="button"
                  onClick={rematch}
                  className="rounded-pill bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  Accept
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={acceptDraw}
                    className="rounded-pill bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={declineDraw}
                    className="rounded-card border border-border bg-surface px-4 py-1.5 text-xs font-bold hover:bg-surface2"
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Board & Player Area */}
        <div className="flex w-full flex-col items-center gap-2">
          <div className="relative flex w-[min(100%,760px,calc(100vh-230px))] flex-col gap-2 pl-3 sm:pl-4 pr-0.5">
            {/* Top Player (Opponent) */}
            {barFor(opponentColor)}

            {/* Board Container with Advantage Gauge */}
            <div className="relative w-full aspect-square">
              {settings.showEval && (
                <div className="absolute -left-3.5 sm:-left-4.5 top-0.5 bottom-0.5 flex items-stretch z-10">
                  <AdvantageGauge score={capturedLists.diffW} flipped={flipped} />
                </div>
              )}

              <div
                ref={boardRef}
                className="relative h-full w-full overflow-hidden rounded-card border-2 border-border/80 bg-surface shadow-xl touch-none select-none cursor-pointer"
                onPointerUp={handleBoardUp}
                onPointerMove={handleBoardMove}
              >
                {/* 64 Board Squares */}
                <div className="grid h-full w-full grid-cols-8 grid-rows-8">{boardSquares}</div>

                {/* Animated Pieces */}
                <div className="pointer-events-none absolute inset-0">{boardPieces}</div>

                {/* Dragged Floating Piece */}
                {drag && (
                  <div
                    className="pointer-events-none absolute z-50"
                    style={{
                      left: `${((drag.x - (boardRef.current?.getBoundingClientRect().left || 0)) / (boardRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
                      top: `${((drag.y - (boardRef.current?.getBoundingClientRect().top || 0)) / (boardRef.current?.getBoundingClientRect().height || 1)) * 100}%`,
                      width: '12.5%',
                      height: '12.5%',
                      transform: 'translate(-50%, -50%) scale(1.15)',
                      filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.5))',
                    }}
                  >
                    {game.get(drag.from) && (
                      <ChessPieceSvg
                        type={game.get(drag.from).type}
                        color={game.get(drag.from).color}
                      />
                    )}
                  </div>
                )}

                {/* Promotion Picker Popover */}
                {pendingPromo && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs gg-modal-in">
                    <div className="flex flex-col items-center gap-3 rounded-modal border border-border bg-surface p-5 shadow-2xl">
                      <span className="text-sm font-bold tracking-tight">Select promotion piece</span>
                      <div className="flex gap-2">
                        {['q', 'r', 'b', 'n'].map((p) => {
                          const promoColor = game.turn();
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => choosePromotion(p)}
                              aria-label={'Promote to ' + p.toUpperCase()}
                              className="group flex h-16 w-16 items-center justify-center rounded-card border border-border bg-surface2 p-2 transition-all hover:scale-105 hover:border-accent hover:bg-surface"
                            >
                              <ChessPieceSvg type={p} color={promoColor} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Player (You) */}
            {barFor(playerColor)}
          </div>

          {/* Quick status & Start / Mute toolbar */}
          <div className="mt-1 flex w-full items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
                aria-label={settings.sound ? 'Mute sound' : 'Unmute sound'}
                className="flex h-8 w-8 items-center justify-center rounded-card border border-border text-muted hover:bg-surface2 hover:text-text transition-colors"
              >
                {settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} className="text-danger" />}
              </button>
              <p className="text-xs font-semibold text-muted">{status}</p>
            </div>

            {!started && (
              <button
                type="button"
                onClick={startGame}
                className="rounded-pill bg-accent px-6 py-2 text-sm font-bold text-white shadow-sm hover:opacity-95 active:scale-98 transition-all"
              >
                Start
              </button>
            )}

            {onlineNote && mode === 'online' && (
              <p className="text-xs text-muted truncate max-w-[200px]">{onlineNote}</p>
            )}
          </div>
        </div>

        {/* Tablet inline moves / game panel */}
        <div className="mt-4 hidden min-[700px]:max-[1099px]:block w-full">
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">{panelNode}</div>
        </div>
      </div>
    </div>
  );

  const toggleRow = (label, key) => (
    <label className="flex w-full items-center justify-between rounded-card bg-surface px-4 py-3 text-sm font-semibold border border-border/60 cursor-pointer">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={settings[key]}
        onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
        className="h-5 w-5 accent-[var(--gg-accent)] rounded cursor-pointer"
      />
    </label>
  );

  const settingsView = (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-4 py-8 select-none">
      <h1 className="text-2xl font-black tracking-tight">Game Settings</h1>

      {/* Theme */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Color Theme</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              localStorage.setItem('gg:theme', 'dark');
              document.documentElement.dataset.theme = 'dark';
            }}
            aria-pressed={theme === 'dark'}
            className={`flex-1 rounded-card px-4 py-2.5 text-sm font-bold transition-all ${
              theme === 'dark' ? 'bg-accent text-white shadow-sm' : 'bg-surface2 text-text hover:bg-surface2/80'
            }`}
          >
            Dark Mode
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              localStorage.setItem('gg:theme', 'light');
              document.documentElement.dataset.theme = 'light';
            }}
            aria-pressed={theme === 'light'}
            className={`flex-1 rounded-card px-4 py-2.5 text-sm font-bold transition-all ${
              theme === 'light' ? 'bg-accent text-white shadow-sm' : 'bg-surface2 text-text hover:bg-surface2/80'
            }`}
          >
            Light Mode
          </button>
        </div>
      </div>

      {/* Board Theme */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Board Style</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(BOARD_THEMES).map(([k, t]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSettings((s) => ({ ...s, boardTheme: k }))}
              aria-pressed={settings.boardTheme === k}
              className={`flex items-center gap-3 rounded-card p-2.5 text-left border transition-all ${
                settings.boardTheme === k
                  ? 'border-accent bg-surface ring-2 ring-accent/30 font-bold'
                  : 'border-border/60 bg-surface2 hover:bg-surface2/80'
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 overflow-hidden rounded border border-black/20">
                <div className="w-1/2 h-full" style={{ backgroundColor: t.light }} />
                <div className="w-1/2 h-full" style={{ backgroundColor: t.dark }} />
              </div>
              <span className="text-xs font-bold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gameplay Toggles */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Play Preferences</p>
        {toggleRow('Show Sound Effects', 'sound')}
        {toggleRow('Show Evaluation Advantage Bar', 'showEval')}
        {toggleRow('Show Board Coordinates', 'coords')}
        {toggleRow('Show Legal Move Hints', 'legalHints')}
        {toggleRow('Auto-flip Board (Pass & Play)', 'autoFlip')}
        {toggleRow('Haptic Feedback (Mobile)', 'haptics')}
      </div>

      {/* Bot Level */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Default Bot Level</p>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(BOT_LEVELS).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setBotLevel(k)}
              aria-pressed={botLevel === k}
              className={`rounded-card py-2 text-xs font-bold transition-all ${
                botLevel === k ? 'bg-accent text-white shadow-xs' : 'bg-surface2 text-text hover:bg-surface2/80'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen min-w-[320px] bg-bg font-sans text-text">
      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar Rail */}
        <div className="hidden min-[1100px]:block">
          <LeftRail
            collapsed={collapsed}
            activeId={view}
            onSelect={handleSelect}
            theme={theme}
            onToggleTheme={toggleTheme}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="min-[1100px]:hidden">
          <BottomTabBar activeId={view} onSelect={handleSelect} />
        </div>

        {/* Main Workspace */}
        <main className="min-h-screen flex-1 pb-20 min-[1100px]:pb-0">
          {view === 'settings' ? settingsView : playView}
        </main>

        {/* Desktop Aside Panel */}
        {view === 'play' && (
          <aside className="hidden min-[1100px]:block w-[360px] shrink-0 border-l border-border bg-surface shadow-sm">
            {panelNode}
          </aside>
        )}
      </div>

      {/* Mobile Floating Sheet Button */}
      {view === 'play' && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-[76px] right-3 z-30 hidden rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-bold shadow-lg max-[699px]:block active:scale-95 transition-transform"
        >
          Game Panel
        </button>
      )}

      {/* Mobile Bottom Sheet Modal */}
      {view === 'play' && sheetOpen && (
        <div
          className="fixed inset-0 z-40 hidden max-[699px]:flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="Game panel"
        >
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="gg-sheet-in relative max-h-[76vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-2 shadow-2xl">
            <div className="flex justify-center py-2">
              <span className="h-1.5 w-12 rounded-pill bg-border" />
            </div>
            {panelNode}
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && result && (
        <Modal onClose={() => setShowResult(false)} labelledBy="gg-result-title">
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl mb-2">
              {result.winner === 'd'
                ? '🤝'
                : (isPassPlay || result.winner === humanColor)
                  ? '🏆'
                  : '♟️'}
            </span>
            <h2 id="gg-result-title" className="text-2xl font-black tracking-tight">
              {result.winner === 'd'
                ? 'Game Drawn'
                : isPassPlay
                  ? `${result.winner === 'w' ? 'White' : 'Black'} Won`
                  : result.winner === humanColor
                    ? 'You Won!'
                    : mode === 'bot'
                      ? 'Stockfish Won'
                      : 'Opponent Won'}
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-muted">
              {result.winner === 'd' ? '½–½' : result.winner === 'w' ? '1–0' : '0–1'} · {REASONS[result.reason] || result.reason}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={rematch}
              className="rounded-pill bg-accent px-5 py-3 text-sm font-bold text-white shadow-md hover:opacity-95 active:scale-98 transition-all"
            >
              Play Rematch
            </button>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={newGame}
                className="rounded-card bg-surface2 px-4 py-2.5 text-sm font-bold hover:bg-surface2/80 transition-colors"
              >
                New Game
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResult(false);
                  setPanelTab('moves');
                }}
                className="rounded-card bg-surface2 px-4 py-2.5 text-sm font-bold hover:bg-surface2/80 transition-colors"
              >
                Review Moves
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowResult(false)}
              className="mt-1 text-xs text-muted hover:text-text py-1 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Resign Modal */}
      {confirmResign && (
        <Modal onClose={() => setConfirmResign(false)} labelledBy="gg-resign-title">
          <div className="flex flex-col gap-2">
            <h2 id="gg-resign-title" className="text-lg font-bold">
              Resign this game?
            </h2>
            <p className="text-sm text-muted">This will forfeit the game to your opponent.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={doResign}
                className="flex-1 rounded-pill bg-danger px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-98 transition-all"
              >
                Resign
              </button>
              <button
                type="button"
                onClick={() => setConfirmResign(false)}
                className="flex-1 rounded-card bg-surface2 px-4 py-2.5 text-sm font-bold hover:bg-surface2/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
