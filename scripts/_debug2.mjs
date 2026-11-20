import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });

const clocks = () => page.locator('span.tabular-nums').allInnerTexts();

console.log('PRE', JSON.stringify(await clocks()));
await page.getByRole('button', { name: 'Start', exact: true }).first().click();
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(100);
  console.log('t+' + (i + 1) * 100 + 'ms', JSON.stringify(await clocks()));
}
await browser.close();
