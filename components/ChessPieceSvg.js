'use client';

// High-fidelity vector chess pieces with refined proportions and premium shading.
// White pieces: warm ivory / pearl gradient with dark espresso outlines
// Black pieces: deep obsidian / charcoal gradient with subtle silver-grey outlines

export function ChessPieceSvg({ type, color, className = '', style = {} }) {
  const isWhite = color === 'w' || color === 'white';
  const t = (type || 'p').toLowerCase();

  const fill = isWhite ? 'url(#gg-wp-grad)' : 'url(#gg-bp-grad)';
  const stroke = isWhite ? '#22201c' : '#eae7e1';
  const innerStroke = isWhite ? '#33302a' : '#d2cec5';

  return (
    <svg
      viewBox="2.5 3.5 40 38"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        filter: isWhite
          ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.38))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.65))',
        ...style,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gg-wp-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#fbf9f5" />
          <stop offset="85%" stopColor="#ede8dc" />
          <stop offset="100%" stopColor="#dfd9cb" />
        </linearGradient>
        <linearGradient id="gg-bp-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c4842" />
          <stop offset="50%" stopColor="#2c2824" />
          <stop offset="100%" stopColor="#181614" />
        </linearGradient>
      </defs>

      {t === 'p' && (
        // Pawn
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
          <path
            d="M12 39.5h21M17 21c1.5 1 9.5 1 11 0M16.5 26.5c2 1 10 1 12 0"
            fill="none"
            stroke={isWhite ? stroke : innerStroke}
            strokeWidth="1.2"
          />
        </g>
      )}

      {t === 'r' && (
        // Rook
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
          <path d="M34 14l-3 3H14l-3-3" />
          <path d="M31 17v12.5H14V17" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
          <path d="M11 14h23" />
          <path
            d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17"
            fill="none"
            stroke={isWhite ? stroke : innerStroke}
            strokeWidth="1"
          />
        </g>
      )}

      {t === 'n' && (
        // Knight
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.632 1.2-1 2.5-.5 1.5-1.59 2.07-3 2.5-2 1-3.5-.5-4.5-2.5-1-2 .5-4 2-5 3.5-2.5 6-3 8.5-8.5 1.5-3.5 3-4 6-5.5 3-1.5 5-1 5 1z" />
          <circle cx="14.5" cy="15.5" r="1.5" fill={isWhite ? '#22201c' : '#eae7e1'} stroke="none" />
          <path
            d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z"
            fill={isWhite ? '#22201c' : '#eae7e1'}
            stroke="none"
          />
          <path
            d="M24.55 10.4c-.45 1.45-1.4 3.1-2.9 4.3-1.9 1.5-4.4 2.2-6.65 1.9"
            fill="none"
            stroke={isWhite ? stroke : innerStroke}
            strokeWidth="1"
          />
        </g>
      )}

      {t === 'b' && (
        // Bishop
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          <path d="M17.5 26h10M15 30h15" fill="none" stroke={isWhite ? stroke : innerStroke} strokeWidth="1.2" />
          <path d="M22.5 15.5v7M20 18.5h5" fill="none" stroke={isWhite ? stroke : innerStroke} strokeWidth="1.2" />
        </g>
      )}

      {t === 'q' && (
        // Queen
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="12" r="2" />
          <circle cx="14" cy="9" r="2" />
          <circle cx="22.5" cy="8" r="2" />
          <circle cx="31" cy="9" r="2" />
          <circle cx="39" cy="12" r="2" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-8.5-16L14 25l-7-11 2 12z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
          <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke={isWhite ? stroke : innerStroke} strokeWidth="1.2" />
          <path d="M11 29a35 35 1 0 0 23 0" fill="none" stroke={isWhite ? stroke : innerStroke} strokeWidth="1.2" />
        </g>
      )}

      {t === 'k' && (
        // King
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22.5 11.63V6M20 8h5" fill="none" stroke={stroke} strokeWidth="1.8" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23v.5C20 16 10.5 13 6.5 19.5c-3 6 5 11 5 11v6.5z" />
          <path
            d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"
            fill="none"
            stroke={isWhite ? stroke : innerStroke}
            strokeWidth="1.2"
          />
        </g>
      )}
    </svg>
  );
}
