import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3111';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + String(e)));
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));

await page.goto(BASE + '/games/chess-queen', { waitUntil: 'networkidle' });

const snap = async (label) => {
  const dialog = await page.locator('[role="dialog"]').count();
  const dialogText = dialog ? await page.locator('[role="dialog"]').first().innerText() : null;
  const status = await page.locator('p.font-semibold').first().innerText().catch(() => null);
  console.log(label, JSON.stringify({ dialog, dialogText, status }));
};

await snap('PRE_START');
await page.getByRole('button', { name: 'Start', exact: true }).first().click();
await page.waitForTimeout(1200);
await snap('AFTER_START');
await page.waitForTimeout(2000);
await snap('AFTER_WAIT');

console.log('LOGS', JSON.stringify(logs.slice(0, 12), null, 2));
await browser.close();
