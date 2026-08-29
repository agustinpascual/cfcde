/* Redimensiona os assets baixados para no máximo 2x o tamanho de exibição.
   O next/image converte para WebP/AVIF em tempo de request; aqui reduzimos a fonte. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.resolve('public/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images');

// largura máxima por padrão de nome (2x o tamanho renderizado)
const RULES = [
  [/^2[56]-bela-power-black/, 1424], // galeria principal 712px
  [/^2[34]-bela-power-black/, 200],  // miniaturas 98px
  [/^(27|28|29)-/, 280],             // imagens dos kits 133px
  [/^42-/, 700],                     // card relacionado 341px
  [/^(10|12|35|36)-/, 700],          // relacionados + outras opções
  [/^00-/, 300],                     // logo 114px
  [/^37-/, 260],                     // foto de avaliação 55px
  [/^(43|44|45|46)-/, 64],           // ícones dos alertas 32px
  [/^(4[89])-/, 40],                 // redes sociais 18px
  [/^(5\d|6[01])-/, 130],            // bandeiras de pagamento
  [/^62-/, 130],                     // selo google
  [/^64-/, 110],                     // whatsapp 50px
  [/^65-/, 160],                     // avatar do chat 72px
  [/^favicon/, 192],
];
const maxFor = (f) => (RULES.find(([re]) => re.test(f)) || [null, 400])[1];

const files = fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f));
let antes = 0, depois = 0;

for (const f of files) {
  const p = path.join(DIR, f);
  const sizeAntes = fs.statSync(p).size;
  antes += sizeAntes;
  try {
    const img = sharp(p);
    const meta = await img.metadata();
    const max = maxFor(f);
    const pipeline = meta.width > max ? img.resize({ width: max, withoutEnlargement: true }) : img;
    const isPng = /\.png$/i.test(f);
    const buf = await (isPng
      ? pipeline.png({ compressionLevel: 9, palette: true, quality: 90 })
      : pipeline.jpeg({ quality: 82, mozjpeg: true })
    ).toBuffer();
    if (buf.length < sizeAntes) fs.writeFileSync(p, buf);
    depois += fs.statSync(p).size;
  } catch (e) {
    depois += sizeAntes;
    console.log('  pulou', f, e.message.slice(0, 50));
  }
}
console.log(`imagens: ${(antes / 1024 / 1024).toFixed(1)} MB -> ${(depois / 1024 / 1024).toFixed(1)} MB (${(100 - (depois / antes) * 100).toFixed(0)}% menor)`);
