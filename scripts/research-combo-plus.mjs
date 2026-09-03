import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'https://cafecomdeuspai.com/produtos/combo-plus/';
const artifactRoot = 'docs/research/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672';
const screenshotRoot = 'docs/design-references/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await fs.mkdir(artifactRoot, { recursive: true });
await fs.mkdir(screenshotRoot, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: chrome });

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-full.png`), fullPage: true });

  const data = await page.evaluate(() => {
    const styleProps = [
      'fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','color','backgroundColor',
      'padding','margin','width','height','maxWidth','display','flexDirection','justifyContent',
      'alignItems','gap','gridTemplateColumns','borderRadius','border','boxShadow','position','zIndex'
    ];
    const styles = (el) => {
      const cs = getComputedStyle(el);
      return Object.fromEntries(styleProps.map((p) => [p, cs[p]]));
    };
    return {
      title: document.title,
      url: location.href,
      bodyText: document.body.innerText,
      htmlClasses: document.documentElement.className,
      links: [...document.querySelectorAll('a')].map((a) => ({ text: a.innerText.trim(), href: a.href, aria: a.getAttribute('aria-label') })),
      buttons: [...document.querySelectorAll('button, [role="button"], input[type="submit"]')].map((b) => ({ text: b.innerText?.trim() || b.value, aria: b.getAttribute('aria-label'), classes: b.className, styles: styles(b) })),
      images: [...document.images].map((img) => ({ src: img.currentSrc || img.src, alt: img.alt, width: img.naturalWidth, height: img.naturalHeight, classes: img.className })),
      backgrounds: [...document.querySelectorAll('*')].map((el) => ({ selector: `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`, bg: getComputedStyle(el).backgroundImage })).filter((x) => x.bg !== 'none'),
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => ({ tag: h.tagName, text: h.innerText.trim(), classes: h.className, styles: styles(h) })),
      header: document.querySelector('header') ? { html: document.querySelector('header').outerHTML, styles: styles(document.querySelector('header')) } : null,
      main: document.querySelector('main') ? { html: document.querySelector('main').outerHTML, styles: styles(document.querySelector('main')) } : null,
      footer: document.querySelector('footer') ? { html: document.querySelector('footer').outerHTML, styles: styles(document.querySelector('footer')) } : null,
      stylesheets: [...document.styleSheets].map((s) => s.href).filter(Boolean),
      fonts: [...new Set([...document.querySelectorAll('*')].slice(0, 500).map((el) => getComputedStyle(el).fontFamily))],
    };
  });
  await fs.writeFile(path.join(artifactRoot, `${viewport.name}.json`), JSON.stringify(data, null, 2));

  const candidates = page.locator('button, a').filter({ hasText: /adicionar|comprar/i });
  if (await candidates.count()) {
    await candidates.first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-cart-open.png`), fullPage: false });
    await fs.writeFile(path.join(artifactRoot, `${viewport.name}-cart.html`), await page.locator('body').innerHTML());
  }
  await context.close();
}

await browser.close();
