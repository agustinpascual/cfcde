import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.COMBO_TEST_BASE_URL;
if(base&&!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local only');
test('old stored coupon never discounts an ordinary checkout; exit offer remains available',{skip:!base},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage({userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"});await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==base)return route.abort();if(route.request().method()!=='GET')return route.abort();return route.continue();});
 await page.addInitScript(()=>localStorage.setItem('cdp-cupom','CAFECOMDEUSPAI27'));
 await page.goto(base+'/checkout?produto=combo-plus2027');await page.getByRole('button',{name:'Adicionar cupom de desconto',exact:true}).waitFor();await page.waitForTimeout(1000);
 assert.equal(await page.locator('body').getByText(/Cupom CAFECOMDEUSPAI27 aplicado/).count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('cdp-cupom')),null);
 await page.goto(base+'/produto/box-plus2027');await page.getByRole('heading',{name:'Lançamento Combo Plus | 2027',exact:true}).waitFor();
 assert.ok((await page.locator('body').innerText()).includes('99,90'));
 assert.equal(await page.getByRole('dialog',{name:/Você ganhou/}).count(),0);
 await page.mouse.move(300,250);await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mouseout',{clientY:0,relatedTarget:null})));
 await page.getByRole('button',{name:'Usar meu desconto',exact:true}).waitFor();await page.getByRole('button',{name:'Usar meu desconto',exact:true}).click();
 await page.waitForURL(/checkout.*cupom=CAFECOMDEUS27/);await page.getByText('Cupom CAFECOMDEUS27 aplicado.',{exact:true}).filter({visible:true}).first().waitFor();
 }finally{await browser.close();}
});
