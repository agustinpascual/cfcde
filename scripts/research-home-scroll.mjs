import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const art='docs/research/cafecomdeuspai-com-8456844d/root-8a5edab2';
const shots='docs/design-references/cafecomdeuspai-com-8456844d/root-8a5edab2';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const vp of [{name:'desktop-loaded',width:1440,height:1000},{name:'mobile-loaded',width:390,height:844}]){
 const page=await browser.newPage({viewport:vp});
 await page.goto('https://cafecomdeuspai.com/',{waitUntil:'networkidle',timeout:60000});
 await page.keyboard.press('Escape');
 const height=await page.evaluate(()=>document.body.scrollHeight);
 for(let y=0;y<height;y+=Math.floor(vp.height*.7)){await page.evaluate(v=>scrollTo(0,v),y);await page.waitForTimeout(250)}
 await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(800);
 await page.screenshot({path:path.join(shots,`${vp.name}-full.png`),fullPage:true});
 const data=await page.evaluate(()=>({text:document.body.innerText,images:[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt,w:i.naturalWidth,h:i.naturalHeight})).filter(i=>i.w>2),headings:[...document.querySelectorAll('h1,h2,h3')].map(h=>h.innerText.trim())}));
 await fs.writeFile(path.join(art,`${vp.name}.json`),JSON.stringify(data,null,2)); await page.close();
}
await browser.close();
