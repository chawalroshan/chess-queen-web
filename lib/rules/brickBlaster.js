// Pure Brick Blaster rules: brick layout, paddle bounce, scoring, level ramp.

export const COLS = 9;
export const ROWS = 6;
export const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60 degrees from vertical
export const BASE_SPEED = 380; // logical px per second
export const MAX_SPEED = 720;
export const LIVES = 3;

const ROW_COLORS = ['#FF4D6D', '#FF8A3D', '#FFD166', '#7BE495', '#4CC9F0', '#9B7BFF'];

export function rowPoints(row, rows) {
  const total = rows || ROWS;
  // Top rows are worth more: bottom row 10, top row 10 + 10*(rows-1).
  return 10 * (total - row);
}

export function ballSpeed(level) {
  const lv = Math.max(1, level || 1);
  return Math.min(MAX_SPEED, BASE_SPEED + (lv - 1) * 45);
}

export function createBricks(level) {
  const lv = Math.max(1, level || 1);
  const rows = Math.min(ROWS + Math.floor((lv - 1) / 2), 8);
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      // Higher levels add a second hit to the top two rows.
      const hp = lv >= 3 && r < 2 ? 2 : 1;
      bricks.push({
        col: c,
        row: r,
        hp,
        points: rowPoints(r, rows),
        color: ROW_COLORS[r % ROW_COLORS.length]
      });
    }
  }
  return bricks;
}

export function bricksLeft(bricks) {
  let n = 0;
  for (const b of bricks) if (b.hp > 0) n++;
  return n;
}

// Angle depends on where the ball hits the paddle: centre goes straight up,
// the edges give up to MAX_BOUNCE_ANGLE. Speed is preserved.
export function paddleBounce(ballX, paddleX, paddleWidth, speed, maxAngle) {
  const half = Math.max(1, paddleWidth / 2);
  const offset = Math.max(-1, Math.min(1, (ballX - paddleX) / half));
  const limit = maxAngle == null ? MAX_BOUNCE_ANGLE : maxAngle;
  const angle = offset * limit;
  return {
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed
  };
}

// Reflect a ball off a brick, choosing the axis with the smallest overlap.
export function brickBounce(ball, brickRect, prevX, prevY) {
  const wasAbove = prevY + ball.r <= brickRect.y;
  const wasBelow = prevY - ball.r >= brickRect.y + brickRect.h;
  const wasLeft = prevX + ball.r <= brickRect.x;
  const wasRight = prevX - ball.r >= brickRect.x + brickRect.w;
  if (wasAbove || wasBelow) return { vx: ball.vx, vy: -ball.vy, axis: 'y' };
  if (wasLeft || wasRight) return { vx: -ball.vx, vy: ball.vy, axis: 'x' };
  // Corner/overlap fallback: flip the dominant axis.
  return Math.abs(ball.vx) > Math.abs(ball.vy)
    ? { vx: -ball.vx, vy: ball.vy, axis: 'x' }
    : { vx: ball.vx, vy: -ball.vy, axis: 'y' };
}

export function circleRectHit(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}
