import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });

const info = await page.evaluate(() => {
  const pick = (label) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(label));
    if (!btn) return { label, missing: true };
    const cs = getComputedStyle(btn);
    return {
      label,
      cls: btn.className,
      bg: cs.backgroundColor,
      color: cs.color,
      w: btn.getBoundingClientRect().width,
      h: btn.getBoundingClientRect().height,
      text: btn.textContent.slice(0, 30),
    };
  };
  return {
    playBot: pick('Play Bot'),
    white: pick('White'),
    start: pick('Start'),
    accentVar: getComputedStyle(document.documentElement).getPropertyValue('--gg-accent'),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
