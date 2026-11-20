import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });

await page.getByRole('button', { name: 'Start', exact: true }).first().click();
await page.waitForTimeout(500);

const board = page.locator('div.relative.aspect-square').first();
const box = await board.boundingBox();
const sq = (file, rank) => ({
  x: box.x + (box.width / 8) * (file.charCodeAt(0) - 97 + 0.5),
  y: box.y + (box.height / 8) * (8 - rank + 0.5),
});

let p = sq('e', 2);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(200);
p = sq('e', 4);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(3500);

await page.getByRole('tab', { name: 'Moves' }).click();
await page.waitForTimeout(300);
const panel = await page.locator('aside').first().innerText();

await page.getByRole('tab', { name: 'Info' }).click();
await page.waitForTimeout(200);
const info = await page.locator('aside').first().innerText();

await page.getByRole('tab', { name: 'Moves' }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: /Resign/ }).click();
await page.waitForTimeout(250);
const dialogVisible = await page.getByRole('dialog').isVisible();
const dialogText = dialogVisible ? await page.getByRole('dialog').innerText() : null;
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: 'C:/Users/chawa/AppData/Local/Temp/opencode/chess-after-move.png' });

console.log(JSON.stringify({ panel: panel.slice(0, 300), info: info.slice(0, 200), dialogText, errors }, null, 2));
await browser.close();
