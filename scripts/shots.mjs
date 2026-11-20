import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const OUT = 'shots';

const CASES = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

const run = async () => {
  const browser = await chromium.launch();
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: OUT + '/chess-queen-' + c.name + '.png' });
    await ctx.close();
  }
  await browser.close();
};

run();
