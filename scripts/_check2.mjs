import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const browser = await chromium.launch();
const out = {};

// --- desktop: resign -> result modal -> pass & play ---
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });

await page.getByRole('button', { name: 'Start', exact: true }).first().click();
await page.waitForTimeout(400);
await page.getByRole('tab', { name: 'Moves' }).click();
await page.getByRole('button', { name: /Resign/ }).click();
await page.getByRole('button', { name: 'Resign', exact: true }).click();
await page.waitForTimeout(400);
out.resultModal = await page.getByRole('dialog').innerText();

// New Game -> Pass & Play -> Start -> both sides playable
await page.getByRole('button', { name: 'New Game' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Pass & Play/ }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Start', exact: true }).first().click();
await page.waitForTimeout(400);

const board = page.locator('div.relative.aspect-square').first();
const box = await board.boundingBox();
const sq = (file, rank) => ({
  x: box.x + (box.width / 8) * (file.charCodeAt(0) - 97 + 0.5),
  y: box.y + (box.height / 8) * (8 - rank + 0.5),
});
let p = sq('e', 2);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(150);
p = sq('e', 4);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(600);
p = sq('d', 7);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(150);
p = sq('d', 5);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(600);

await page.getByRole('tab', { name: 'Moves' }).click();
await page.waitForTimeout(200);
out.passPlayMoves = (await page.locator('aside').first().innerText()).replace(/\n/g, ' ').slice(0, 120);
await ctx.close();

// --- mobile: bottom sheet ---
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mctx.newPage();
await mpage.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });
await mpage.getByRole('button', { name: 'Game panel' }).click();
await mpage.waitForTimeout(400);
out.sheetVisible = await mpage.getByRole('dialog', { name: 'Game panel' }).isVisible();
out.sheetText = (await mpage.getByRole('dialog', { name: 'Game panel' }).innerText()).replace(/\n/g, ' ').slice(0, 140);
await mpage.screenshot({ path: 'C:/Users/chawa/AppData/Local/Temp/opencode/chess-mobile-sheet.png' });
await mctx.close();

out.errors = errors;
console.log(JSON.stringify(out, null, 2));
await browser.close();
