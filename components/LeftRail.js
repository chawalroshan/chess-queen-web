'use client';

import { BookOpen, ChevronsLeft, ChevronsRight, Moon, Puzzle, Settings, Swords, Sun } from 'lucide-react';

const ITEMS = [
  { id: 'play', label: 'Play', icon: Swords, disabled: false },
  { id: 'puzzles', label: 'Puzzles', icon: Puzzle, disabled: true },
  { id: 'learn', label: 'Learn', icon: BookOpen, disabled: true },
  { id: 'settings', label: 'Settings', icon: Settings, disabled: false },
];

export function BottomTabBar({ activeId, onSelect }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[64px] items-stretch justify-around border-t border-border bg-surface lg:hidden" aria-label="Game">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          type="button"
          disabled={it.disabled}
          onClick={() => onSelect(it.id)}
          aria-label={it.label}
          aria-current={activeId === it.id ? 'page' : undefined}
          className={`flex flex-1 items-center justify-center ${activeId === it.id ? 'text-accent' : 'text-muted'} disabled:cursor-not-allowed`}
        >
          <it.icon size={22} />
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
        className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold transition-colors ${
          active ? 'bg-surface2 text-text' : 'text-muted'
        } ${it.disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-surface2'}`}
      >
        <Icon size={20} />
        {!collapsed && <span className="truncate">{it.label}</span>}
      </button>
    );
  };

  return (
    <nav className={`flex h-screen shrink-0 flex-col gap-1 border-r border-border bg-surface px-2 py-3 ${width}`} aria-label="Game">
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}
        className="mb-2 flex w-full items-center justify-center rounded-card border border-border px-2 py-1.5 text-muted hover:bg-surface2"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
      <div className="flex flex-col gap-1">{ITEMS.map(item)}</div>
      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface2"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && <span className="truncate">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>
      </div>
    </nav>
  );
}
