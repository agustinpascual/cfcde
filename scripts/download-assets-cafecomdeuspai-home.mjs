import fs from 'node:fs/promises';
import path from 'node:path';
const source=JSON.parse(await fs.readFile('docs/research/cafecomdeuspai-com-8456844d/root-8a5edab2/desktop-loaded.json','utf8'));
const root='public/sites/cafecomdeuspai-com-8456844d/root-8a5edab2'; await fs.mkdir(root,{recursive:true});
const urls=[...new Set(source.images.map(x=>x.src).filter(x=>/^https:/.test(x) && !x.includes('empty-placeholder')))];
const manifest=[]; let index=0;
for(const url of urls){
 const u=new URL(url); const raw=path.basename(u.pathname); const ext=(path.extname(raw)||'.bin').slice(0,8); const name=`asset-${String(++index).padStart(3,'0')}${ext}`;
 try{const res=await fetch(url);if(!res.ok)throw new Error(String(res.status));await fs.writeFile(path.join(root,name),Buffer.from(await res.arrayBuffer()));manifest.push({name,url,alt:source.images.find(x=>x.src===url)?.alt||''});}catch(error){console.error('skip',url,String(error))}
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
