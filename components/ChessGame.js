'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import LeftRail, { BottomTabBar } from './LeftRail';
import { getBotMove, closeBot, BOT_LEVELS } from '../lib/stockfishBot';

const GLYPHS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const START_LIGHT = '#eeeed2';
const START_DARK = '#769656';
const SELECT_BG = 'rgba(126, 199, 79, 0.5)';
const LAST_BG = 'rgba(238, 226, 120, 0.45)';
const CHECK_GLOW = 'inset 0 0 34px 6px rgba(229, 83, 75, 0.85)';

const PANEL_TABS = ['new', 'moves', 'info'];

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

export function ChessGame() {
  const [game] = useState(() => new Chess());
  const [view, setView] = useState('play');
  const [theme, setTheme] = useState('dark');
  const [collapsed, setCollapsed] = useState(false);
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [drag, setDrag] = useState(null);
  const [capturedFx, setCapturedFx] = useState(null);
  const [moveIdx, setMoveIdx] = useState(-1);
  const [sans, setSans] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [haptics] = useState(true);
  const [botLevel, setBotLevel] = useState('medium');
  const [panelTab, setPanelTab] = useState('new');
  const [clockMs, setClockMs] = useState({ w: 60000, b: 60000 });
  const [result, setResult] = useState(null);
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const fensRef = useRef(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);

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

  const history = game.history({ verbose: true });
  const lastMove = history && history.length ? history[history.length - 1] : null;
  const checkSq = game.inCheck() ? kingSquare(game, game.turn()) : null;
  const gameOver = started && game.isGameOver();
  const interactive = started && !pendingPromo && !gameOver && view === 'play' && game.turn() === 'w';
  const gameResult = gameOver ? (game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : 'd') : null;

  const applyMoveObj = (move) => {
    const ok = game.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!ok) return;
    fensRef.current.push(game.fen());
    setSans((p) => [...p, move.san]);
    setMoveCount((c) => c + 1);
    setSelected(null);
    setMoveIdx(-1);
    if (move.captured) {
      setCapturedFx({ sq: move.to });
      window.setTimeout(() => setCapturedFx(null), 240);
    }
    if (haptics) {
      try { navigator.vibrate?.(10); } catch (e) {}
    }
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
    return 'abcdefgh'[col] + (8 - row);
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
      dragRef.current = { from: sq, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false };
      setDrag({ from: sq, x: e.clientX, y: e.clientY });
    }
  };

  const handleBoardMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
    dragRef.current = { ...d, x: e.clientX, y: e.clientY, moved };
    setDrag({ from: d.from, x: e.clientX, y: e.clientY, moved });
  };

  const handleBoardUp = () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const wasMoving = d.moved;
    setDrag(null);
    if (wasMoving) {
      const sq = sqFromPoint(d.x, d.y);
      if (sq && sq !== d.from) attemptMove(d.from, sq);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (pendingPromo) { if (e.key === 'Escape') setPendingPromo(null); return; }
      if (e.key === 'Escape') { setSelected(null); return; }
      if (e.key === 'f' || e.key === 'F') { setFlipped((f) => !f); return; }
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
        if (next !== -1) { game.load(fensRef.current[next]); setSelected(null); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => () => closeBot(), []);

  useEffect(() => {
    if (!started || pendingPromo || gameOver) return;
    if (game.turn() !== 'b') return;
    let cancelled = false;
    getBotMove(game.fen(), botLevel).then((m) => {
      if (cancelled || !m) return;
      attemptMove(m.from, m.to);
    });
    return () => { cancelled = true; };
  }, [game, started, pendingPromo, gameOver, botLevel, moveCount]);

  useEffect(() => {
    if (!started || gameOver) return;
    const id = window.setInterval(() => {
      setClockMs((c) => {
        const t = game.turn();
        const next = Math.max(0, (c[t] || 0) - 1000);
        if (next === 0) window.setTimeout(() => setResult({ winner: t === 'w' ? 'b' : 'w', reason: 'timeout' }), 0);
        return { ...c, [t]: next };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, gameOver, game]);

  const status = !started
    ? 'White to move — press Start'
    : gameOver
      ? (game.isCheckmate() ? 'Checkmate' : 'Draw')
      : game.turn() === 'w'
        ? 'White to move'
        : 'Black to move';

  const movePairs = [];
  for (let i = 0; i + 1 < sans.length; i += 2) movePairs.push([sans[i], sans[i + 1]]);

  const squaresRender = (() => {
    const out = [];
    const arr = game.board();
    for (let dr = 0; dr < 8; dr++) {
      const r = flipped ? 7 - dr : dr;
      const rowArr = arr[r];
      for (let dc = 0; dc < 8; dc++) {
        const c = flipped ? 7 - dc : dc;
        const piece = rowArr[c];
        const rank = 8 - r;
        const sq = 'abcdefgh'[c] + rank;
        const light = (c + rank) % 2 === 0;
        let bg = light ? START_LIGHT : START_DARK;
        let isCheck = false;
        if (selected && sq === selected) bg = SELECT_BG;
        else if (lastMove && (sq === lastMove.from || sq === lastMove.to)) bg = LAST_BG;
        else if (checkSq && sq === checkSq) { bg = START_LIGHT; isCheck = true; }
        const targetMove = selected && targets.has(sq) ? game.moves({ verbose: true }).find((m) => m.from === selected && m.to === sq) : null;
        out.push(
          <div
            key={sq}
            className="relative border border-black/10"
            style={{ backgroundColor: bg, boxShadow: isCheck ? CHECK_GLOW : undefined }}
            onPointerDown={(e) => handleSquareDown(e, sq)}
          >
            {targetMove && (
              <div
                className="absolute pointer-events-none flex items-center justify-center"
                style={targetMove.captured ? { inset: '8%', border: '3px solid rgba(20,20,20,0.45)', borderRadius: '50%' } : { inset: '18%', borderRadius: '50%', backgroundColor: 'rgba(20,20,20,0.35)' }}
              />
            )}
            {piece && !(drag && drag.from === sq) && (
              <span
                className="absolute inset-0 flex items-center justify-center text-3xl md:text-5xl"
                style={{
                  opacity: capturedFx && capturedFx.sq === sq ? 0 : 1,
                  left: ((c + 0.5) * 12.5) + '%',
                  top: ((r + 0.5) * 12.5) + '%',
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 160ms ease-out, top 160ms ease-out',
                }}
              >
                {GLYPHS[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
              </span>
            )}
          </div>,
        );
      }
    }
    return out;
  })();

  const PIECE_VAL = { p: 1, n: 1.25, b: 3.25, r: 5, q: 9 };
  const capturedLists = (() => {
    const boardArr = game.board();
    const startQty = { w: { p: 8, n: 2, b: 2, r: 2, q: 1 }, b: { p: 8, n: 2, b: 2, r: 2, q: 1 } };
    const missing = (color) => {
      const on = { p: 0, n: 0, b: 0, r: 0, q: 0 };
      for (const row of boardArr) for (const sq of row) if (sq && sq.color === color) on[sq.type] += 1;
      const out = [];
      for (const t of ['q', 'r', 'b', 'n', 'p']) {
        const cap = startQty[color][t] - on[t];
        for (let i = 0; i < cap; i++) out.push({ t });
      }
      return out;
    };
    const byWhite = missing('b');
    const byBlack = missing('w');
    const val = (l) => l.reduce((s, p) => s + (PIECE_VAL[p.t] || 0), 0);
    const whiteVal = val(byWhite);
    const blackVal = val(byBlack);
    const glyphs = (l) => l.map((p) => GLYPHS[p.t.toUpperCase()]).join(' ');
    return { byWhite, byBlack, whiteVal, blackVal, glyphs, diffW: whiteVal - blackVal };
  })();
  const clockFmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };

  const playView = (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-text">
      <div className="mx-auto w-full max-w-[760px] flex-1 flex-col justify-center px-3 py-6">
        <div className="flex w-full max-w-[760px] items-center gap-2 rounded-card bg-surface px-3 py-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface2 text-xl">🤖</span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">GG Bot · {BOT_LEVELS[botLevel].label}</span>
            <span className="text-xs text-muted">Rating —</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {capturedLists.diffW < 0 && <span className="text-xs font-bold text-muted">+{-capturedLists.diffW}</span>}
            <span className="text-lg tracking-wide">{capturedLists.glyphs(capturedLists.byBlack)}</span>
          </div>
          <span className={`ml-auto text-sm font-bold tabular-nums ${clockMs.b < 10000 && !gameOver ? 'text-danger' : 'text-muted'}`}>{clockFmt(clockMs.b)}</span>
        </div>
        <div
          ref={boardRef}
          className="relative aspect-square w-full max-w-[760px] overflow-hidden rounded-card border border-border bg-surface touch-none select-none"
          style={{ transform: flipped ? 'rotate(180deg)' : 'none', transition: 'transform 250ms ease' }}
          onPointerUp={handleBoardUp}
          onPointerMove={handleBoardMove}
        >
          <div className="grid h-full w-full grid-cols-8 grid-rows-8">{squaresRender}</div>
          {drag && (
            <div
              className="absolute"
              style={{
                left: `${((drag.x - (boardRef.current?.getBoundingClientRect().left || 0)) / (boardRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
                top: `${((drag.y - (boardRef.current?.getBoundingClientRect().top || 0)) / (boardRef.current?.getBoundingClientRect().height || 1)) * 100}%`,
                width: '12.5%',
                height: '12.5%',
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center" style={{ transform: 'translate(-50%, -50%)' }}>
                <span className="text-3xl md:text-5xl">{GLYPHS[game.get(drag.from)?.color === 'w' ? game.get(drag.from).type.toUpperCase() : game.get(drag.from).type]}</span>
              </span>
            </div>
          )}
          {pendingPromo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-2 rounded-card bg-surface px-4 py-3">
                <span className="text-sm font-bold">Promote to</span>
                <div className="flex gap-2">
                  {['q', 'r', 'b', 'n'].map((p) => (
                    <button key={p} type="button" onClick={() => choosePromotion(p)} aria-label={'Promote to ' + p} className="rounded-card bg-surface2 px-2 py-1 text-2xl">
                      {GLYPHS[p.toUpperCase()]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex w-full max-w-[760px] items-center gap-2 rounded-card bg-surface px-3 py-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface2 text-xl">😎</span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">You</span>
            <span className="text-xs text-muted">Rating —</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {capturedLists.diffW > 0 && <span className="text-xs font-bold text-muted">+{capturedLists.diffW}</span>}
            <span className="text-lg tracking-wide">{capturedLists.glyphs(capturedLists.byWhite)}</span>
          </div>
          <span className={`ml-auto text-sm font-bold tabular-nums ${clockMs.w < 10000 && !gameOver ? 'text-danger' : 'text-muted'}`}>{clockFmt(clockMs.w)}</span>
        </div>
        <div className="mt-4 flex w-full max-w-[760px] flex-col items-center gap-4">
          <p className="text-sm font-semibold text-muted">{status}</p>
          {started && movePairs.length > 0 && (
            <div className="flex w-full max-w-[760px] flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {movePairs.map((pair, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted">{i + 1}.</span>
                  <span className="text-sm font-bold">{pair[0]}</span>
                  <span className="text-sm font-bold">{pair[1]}</span>
                </div>
              ))}
            </div>
          )}
          {!started && (
            <button type="button" onClick={() => setStarted(true)} className="rounded-pill bg-accent px-8 py-3 text-base font-bold text-white">
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const settingsView = (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-text">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-muted">Theme</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'} className={`rounded-pill px-5 py-2 text-sm font-bold ${theme === 'dark' ? 'bg-accent text-white' : 'bg-surface2 text-text'}`}>
                Dark
              </button>
              <button type="button" onClick={() => setTheme('light')} aria-pressed={theme === 'light'} className={`rounded-pill px-5 py-2 text-sm font-bold ${theme === 'light' ? 'bg-accent text-white' : 'bg-surface2 text-text'}`}>
                Light
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-bold text-text">Bot level</p>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(BOT_LEVELS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setBotLevel(k)} aria-pressed={botLevel === k} className={`rounded-pill px-4 py-2 text-sm font-bold ${botLevel === k ? 'bg-accent text-white' : 'bg-surface2 text-text'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg font-sans text-text">
      <div className="flex min-h-screen">
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
        <div className="min-[1100px]:hidden">
          <BottomTabBar activeId={view} onSelect={handleSelect} />
        </div>
        <main className="min-h-screen flex-1">{view === 'settings' ? settingsView : playView}</main>
        {view === 'play' && (
          <aside className="hidden min-[1100px]:block w-[360px] shrink-0 border-l border-border bg-surface">
            <div className="flex h-full flex-col">
              <div className="flex border-b border-border">
                {PANEL_TABS.map((t) => (
                  <button key={t} type="button" onClick={() => setPanelTab(t)} className={`flex-1 px-3 py-2 text-sm font-bold ${panelTab === t ? 'bg-surface2 text-text' : 'text-muted'}`}>
                    {t === 'new' ? 'New Game' : t === 'moves' ? 'Moves' : 'Info'}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {panelTab === 'new' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-bold">Bot</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(BOT_LEVELS).map((k) => (
                        <button key={k} type="button" onClick={() => setBotLevel(k)} className={`rounded-card px-2 py-2 text-sm font-bold ${botLevel === k ? 'bg-accent text-white' : 'bg-surface2 text-text'}`}>
                          {BOT_LEVELS[k].label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setStarted(true)} className="rounded-pill bg-accent px-6 py-3 text-base font-bold text-white">Start</button>
                  </div>
                )}
                {panelTab === 'moves' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { const i = 0; if (fensRef.current[i]) game.load(fensRef.current[i]); setMoveIdx(0); }} className="rounded-card bg-surface2 px-2 py-1 text-sm font-bold">⏮</button>
                      <button type="button" onClick={() => { const lastIdx = fensRef.current.length - 1; const cur = moveIdx === -1 ? lastIdx : moveIdx; const next = Math.max(0, cur - 1); setMoveIdx(next); if (fensRef.current[next]) game.load(fensRef.current[next]); }} className="rounded-card bg-surface2 px-2 py-1 text-sm font-bold">◀</button>
                      <button type="button" onClick={() => { const lastIdx = fensRef.current.length - 1; const cur = moveIdx === -1 ? lastIdx : moveIdx; const next = Math.min(lastIdx, cur + 1); setMoveIdx(next); if (fensRef.current[next]) game.load(fensRef.current[next]); }} className="rounded-card bg-surface2 px-2 py-1 text-sm font-bold">▶</button>
                      <button type="button" onClick={() => { const lastIdx = fensRef.current.length - 1; setMoveIdx(lastIdx); if (fensRef.current[lastIdx]) game.load(fensRef.current[lastIdx]); }} className="rounded-card bg-surface2 px-2 py-1 text-sm font-bold">⏭</button>
                    </div>
                    {movePairs.length > 0 && (
                      <div className="flex flex-col gap-1 text-sm">
                        {movePairs.map((pair, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="text-muted">{i + 1}.</span>
                            <span className="font-bold">{pair[0]}</span>
                            <span className="font-bold">{pair[1]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {panelTab === 'info' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold">{status}</p>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(game.fen())} className="rounded-card bg-surface2 px-3 py-2 text-sm font-bold">Copy FEN</button>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(sans.join(' ')) } className="rounded-card bg-surface2 px-3 py-2 text-sm font-bold">Copy PGN</button>
                  </div>
                )}
              </div>
            </div>
        </aside>
        )}
      </div>
    </div>
  );
}
