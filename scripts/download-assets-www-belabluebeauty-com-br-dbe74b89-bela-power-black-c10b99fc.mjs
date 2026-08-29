// Baixa os assets de https://www.belabluebeauty.com.br/bela-power-black/
// Destino: public/sites/<site-key>/<page-key>/images
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'www-belabluebeauty-com-br-dbe74b89';
const PAGE = 'bela-power-black-c10b99fc';
const DEST = path.resolve(`public/sites/${SITE}/${PAGE}/images`);
const MANIFEST = path.resolve(process.env.MANIFEST || 'scripts/assets-manifest.json');
fs.mkdirSync(DEST, { recursive: true });

const list = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function one({ url, name }) {
  const out = path.join(DEST, name);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) return { name, status: 'cached' };
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.belabluebeauty.com.br/' } });
    if (!res.ok) return { name, status: 'HTTP ' + res.status, url };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 64) return { name, status: 'empty', url };
    fs.writeFileSync(out, buf);
    return { name, status: 'ok', bytes: buf.length };
  } catch (e) {
    return { name, status: 'ERR ' + e.message.slice(0, 60), url };
  }
}

const results = [];
for (let i = 0; i < list.length; i += 4) {
  results.push(...await Promise.all(list.slice(i, i + 4).map(one)));
}
const bad = results.filter(r => r.status !== 'ok' && r.status !== 'cached');
console.log(`baixados ${results.filter(r => r.status === 'ok').length}/${list.length}, cache ${results.filter(r => r.status === 'cached').length}, falhas ${bad.length}`);
bad.forEach(b => console.log('  FALHA', b.name, b.status, b.url));
