'use client';

import { BookOpen, ChevronsLeft, ChevronsRight, Moon, Puzzle, Settings, Swords, Sun } from 'lucide-react';

const ITEMS = [
  { id: 'play', label: 'Play', icon: Swords, disabled: false },
  { id: 'puzzles', label: 'Puzzles', icon: Puzzle, disabled: true, badge: 'Soon' },
  { id: 'learn', label: 'Learn', icon: BookOpen, disabled: true, badge: 'Soon' },
  { id: 'settings', label: 'Settings', icon: Settings, disabled: false },
];

export function BottomTabBar({ activeId, onSelect }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[64px] items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur-sm lg:hidden" aria-label="Game navigation">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          type="button"
          disabled={it.disabled}
          onClick={() => onSelect(it.id)}
          aria-label={it.label}
          aria-current={activeId === it.id ? 'page' : undefined}
          className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
            activeId === it.id ? 'text-accent font-bold' : 'text-muted hover:text-text'
          } ${it.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          <it.icon size={20} />
          <span className="text-[10px] tracking-tight">{it.label}</span>
          {activeId === it.id && (
            <span className="absolute bottom-1 h-1 w-6 rounded-pill bg-accent" />
          )}
        </button>
      ))}
    </nav>
  );
}

export default function LeftRail({ collapsed, activeId, onSelect, theme, onToggleTheme, onToggleCollapse }) {
  const width = collapsed ? 'w-16' : 'w-[220px]';

  const item = (it) => {
    const Icon = it.icon;
    const active = activeId === it.id;
    return (
      <button
        key={it.id}
        type="button"
        disabled={it.disabled}
        onClick={() => onSelect(it.id)}
        aria-label={it.label}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold transition-all ${
          active
            ? 'bg-surface2 text-text shadow-sm'
            : 'text-muted hover:bg-surface2/70 hover:text-text'
        } ${it.disabled ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        <Icon size={20} className={active ? 'text-accent' : 'text-muted group-hover:text-text'} />
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between min-w-0">
            <span className="truncate">{it.label}</span>
            {it.badge && (
              <span className="rounded-pill bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted border border-border">
                {it.badge}
              </span>
            )}
          </div>
        )}
        {active && !collapsed && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-pill bg-accent" />
        )}
      </button>
    );
  };

  return (
    <nav
      className={`flex h-screen shrink-0 flex-col gap-1 border-r border-border bg-surface px-2.5 py-3 pb-20 ${width} transition-all duration-200 select-none`}
      aria-label="Game navigation"
    >
      {/* Brand & Collapse Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-card bg-accent text-white shadow-sm font-black text-base">
              GG
            </div>
            <span className="text-base font-bold tracking-tight">GG Chess</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex h-8 w-8 items-center justify-center rounded-card border border-border text-muted transition-colors hover:bg-surface2 hover:text-text ${
            collapsed ? 'mx-auto' : ''
          }`}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1.5">{ITEMS.map(item)}</div>

      {/* Theme Toggle — padded well above bottom edge to prevent dev overlay overlap */}
      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex w-full items-center gap-3 rounded-card border border-border/60 bg-surface2/50 px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface2 hover:text-text"
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
          {!collapsed && <span className="truncate">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>}
        </button>
      </div>
    </nav>
  );
}
