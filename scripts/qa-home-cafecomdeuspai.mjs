import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out='docs/design-references/cafecomdeuspai-com-8456844d/root-8a5edab2';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={};
for(const vp of [{name:'clone-desktop',width:1440,height:1000},{name:'clone-mobile',width:390,height:844}]){
 const page=await browser.newPage({viewport:vp}); await page.goto('http://localhost:9911/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1200);
 const height=await page.evaluate(()=>document.body.scrollHeight);for(let y=0;y<height;y+=Math.floor(vp.height*.75)){await page.evaluate(v=>scrollTo(0,v),y);await page.waitForTimeout(100)}await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`${out}/${vp.name}-full.png`,fullPage:true});
 const next=page.getByRole('button',{name:/Próximo slide/i}); if(await next.count()) await next.click();
 const bag=page.getByRole('button',{name:'Abrir sacola'}); await bag.click(); await page.waitForTimeout(400); const cart=await page.getByRole('dialog',{name:'Seu carrinho'}).isVisible(); await page.keyboard.press('Escape');
 const cookie=page.getByRole('button',{name:/Aceitar/i}); if(await cookie.count())await cookie.click();
 report[vp.name]={cart,heroControls:await next.count(),cookieDismissed:!(await cookie.isVisible().catch(()=>false)),productLinks:await page.locator('a[href*="produtos"]').count()}; await page.close();
}
await fs.writeFile('docs/research/cafecomdeuspai-com-8456844d/root-8a5edab2/QA_REPORT.json',JSON.stringify(report,null,2));await browser.close();
