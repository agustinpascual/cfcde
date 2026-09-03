import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const texts=['LANÇAMENTO','DESTAQUES','IMPERDÍVEL','Quer receber novidades?','Descubra cada detalhe em vídeo','SOBRE O AUTOR:','Junior Rostirola','Atendimento','Dúvidas sobre seus pedidos?'];
const result={};
for(const [name,url] of [['original','https://cafecomdeuspai.com/'],['clone','http://localhost:9911/']]){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(2000);result[name]={};
 for(const text of texts){const loc=page.getByText(text,{exact:true}).first();if(await loc.count())result[name][text]=await loc.evaluate(el=>{const s=getComputedStyle(el);return{tag:el.tagName,family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,letter:s.letterSpacing,transform:s.textTransform,color:s.color}})}
 result[name].body=await page.locator('body').evaluate(el=>{const s=getComputedStyle(el);return{family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight}});await page.close();
}
await fs.writeFile('docs/research/cafecomdeuspai-com-8456844d/root-8a5edab2/FONT_DIFF.json',JSON.stringify(result,null,2));await browser.close();
