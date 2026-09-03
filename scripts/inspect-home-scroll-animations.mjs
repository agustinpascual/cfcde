import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('https://cafecomdeuspai.com/',{waitUntil:'networkidle',timeout:60000});
await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(400);
const selectors=['section','.js-home-products','.js-swiper-products','.js-visibility-trigger','.js-visibility-element','[data-transition]','[data-aos]'];
const snap=async label=>page.evaluate(({selectors,label})=>({label,y:scrollY,items:[...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]))].slice(0,120).map((el,i)=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{i,tag:el.tagName,classes:String(el.className).slice(0,220),top:r.top,height:r.height,opacity:s.opacity,transform:s.transform,transition:s.transition,animation:s.animation,visibility:s.visibility}})}),{selectors,label});
const frames=[await snap('top')];
for(const y of [700,1400,2200,3000,4000]){await page.evaluate(v=>scrollTo(0,v),y);await page.waitForTimeout(600);frames.push(await snap(`y${y}`));}
await fs.writeFile('docs/research/cafecomdeuspai-com-8456844d/root-8a5edab2/SCROLL_ANIMATIONS.json',JSON.stringify(frames,null,2));
await browser.close();
