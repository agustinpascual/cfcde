import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = 'http://localhost:9911/produtos/combo-plus/';
const out = 'docs/design-references/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const report = {};

for (const viewport of [{ name: 'clone-desktop', width: 1440, height: 1000 }, { name: 'clone-mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `${viewport.name}-full.png`), fullPage: true });
  await page.getByRole('button', { name: 'Comprar' }).click();
  await page.waitForTimeout(800);
  const drawerVisible = await page.getByRole('dialog', { name: 'Seu carrinho' }).isVisible();
  await page.screenshot({ path: path.join(out, `${viewport.name}-cart.png`), fullPage: false });
  await page.getByRole('button', { name: 'Aumentar quantidade' }).last().click();
  const subtotal = await page.locator('text=Subtotal').locator('..').innerText();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  report[viewport.name] = { drawerVisible, subtotal, closed: !(await page.getByRole('dialog', { name: 'Seu carrinho' }).isVisible()) };
  await page.close();
}

await fs.writeFile('docs/research/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/QA_REPORT.json', JSON.stringify(report, null, 2));
await browser.close();
