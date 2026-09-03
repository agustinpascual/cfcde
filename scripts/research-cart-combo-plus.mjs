import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'https://cafecomdeuspai.com/produtos/combo-plus/';
const out = 'docs/research/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672';
const shots = 'docs/design-references/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  for (const selector of ['.js-newsletter-popup-close', '.js-modal-close', '[data-dismiss="modal"]', '.modal-close']) {
    const close = page.locator(selector).first();
    if (await close.count()) await close.click({ force: true }).catch(() => {});
  }
  await page.keyboard.press('Escape');
  const buy = page.locator('button.js-addtocart:visible, input.js-addtocart:visible').first();
  await buy.scrollIntoViewIfNeeded();
  await buy.click({ force: true });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(shots, `${viewport.name}-actual-cart-open.png`), fullPage: false });
  const state = await page.evaluate(() => ({
    text: document.body.innerText,
    dialogs: [...document.querySelectorAll('[role="dialog"], .modal, .drawer, .cart, [class*="cart"]')].filter((el) => {
      const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
    }).map((el) => ({ classes: el.className, text: el.innerText, html: el.outerHTML.slice(0, 30000), rect: el.getBoundingClientRect().toJSON() })),
  }));
  await fs.writeFile(path.join(out, `${viewport.name}-actual-cart.json`), JSON.stringify(state, null, 2));
  await page.close();
}
await browser.close();
