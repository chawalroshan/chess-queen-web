import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });

const info = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('div')].filter((d) =>
    (d.className || '').includes('max-[1099px]:block')
  );
  return nodes.map((n) => ({
    cls: n.className,
    display: getComputedStyle(n).display,
    h: n.getBoundingClientRect().height,
  }));
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
