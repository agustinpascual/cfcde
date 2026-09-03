import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const artifactRoot = 'docs/research/cafecomdeuspai-com-8456844d/root-8a5edab2';
const screenshotRoot = 'docs/design-references/cafecomdeuspai-com-8456844d/root-8a5edab2';
await fs.mkdir(artifactRoot, { recursive: true });
await fs.mkdir(screenshotRoot, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });

for (const viewport of [{name:'desktop',width:1440,height:1000},{name:'tablet',width:768,height:1000},{name:'mobile',width:390,height:844}]) {
  const page = await browser.newPage({ viewport });
  await page.goto('https://cafecomdeuspai.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-full.png`), fullPage: true });
  const data = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText,
    images: [...document.images].map(i => ({src:i.currentSrc||i.src,alt:i.alt,w:i.naturalWidth,h:i.naturalHeight,classes:i.className})),
    links: [...document.querySelectorAll('a')].map(a => ({text:a.innerText.trim(),href:a.href,classes:a.className})),
    buttons: [...document.querySelectorAll('button,[role=button]')].map(b => ({text:b.innerText.trim(),aria:b.getAttribute('aria-label'),classes:b.className})),
    headings: [...document.querySelectorAll('h1,h2,h3')].map(h => ({tag:h.tagName,text:h.innerText.trim(),classes:h.className})),
    backgrounds: [...document.querySelectorAll('*')].map(el => ({bg:getComputedStyle(el).backgroundImage,classes:String(el.className)})).filter(x=>x.bg!=='none'),
    fonts: [...new Set([...document.querySelectorAll('*')].slice(0,600).map(el=>getComputedStyle(el).fontFamily))],
  }));
  await fs.writeFile(path.join(artifactRoot, `${viewport.name}.json`), JSON.stringify(data,null,2));
  await page.keyboard.press('Escape');
  await page.close();
}
await browser.close();
