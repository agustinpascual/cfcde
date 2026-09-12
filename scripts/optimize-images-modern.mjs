/* Converte fontes raster grandes para WebP e corrige arquivos WebP que foram
   baixados com extensão .jpg. Execute sem argumento para auditar e com
   --write para aplicar. SVG, GIF, ícones sociais e imagens já modernas ficam
   intocados. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WRITE = process.argv.includes("--write");
const IMAGE_ROOTS = ["public/sites", "public/marca", "src/lib"];
const TEXT_ROOTS = ["src", "scripts", "docs"];
const TEXT_FILES = ["next.config.ts"];
const SOURCE_EXT = /\.(png|jpe?g)$/i;
const TEXT_EXT = /\.(tsx?|jsx?|css|json|md|mjs|sql)$/i;
const MIN_BYTES = 8 * 1024;
const MIN_SAVING = 0.10;
/* E-mail e compartilhamento mantêm PNG/JPEG por compatibilidade com clientes
   de e-mail e crawlers que ainda não exibem WebP de modo consistente. */
const KEEP = /(^|[-_.])(favicon|apple-icon|opengraph|twitter-image|og-compartilhamento|email-logo|logo)([-_.]|$)/i;

function walk(root, filter) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(file, filter));
    else if (filter(file)) result.push(file);
  }
  return result;
}

const images = IMAGE_ROOTS.flatMap(root => walk(root, file => SOURCE_EXT.test(file)));
const changes = [];
for (const source of images) {
  const before = fs.statSync(source).size;
  const metadata = await sharp(source).metadata();
  const target = source.replace(SOURCE_EXT, ".webp");
  if (target === source || fs.existsSync(target)) continue;

  if (metadata.format === "webp") {
    changes.push({ source, target, before, after: before, buffer: null, reason: "extensão corrigida" });
    continue;
  }
  if (before < MIN_BYTES || KEEP.test(path.basename(source))) continue;

  const pipeline = sharp(source).rotate();
  const buffer = metadata.hasAlpha
    ? await pipeline.webp({ lossless: true, effort: 6 }).toBuffer()
    : await pipeline.webp({ quality: 84, smartSubsample: true, effort: 5 }).toBuffer();
  if (buffer.length > before * (1 - MIN_SAVING)) continue;
  changes.push({ source, target, before, after: buffer.length, buffer, reason: metadata.hasAlpha ? "WebP lossless" : "WebP q84" });
}

const replacements = new Map();
for (const change of changes) {
  replacements.set(change.source.replace(/^public/, ""), change.target.replace(/^public/, ""));
  replacements.set(change.source, change.target);
  if (change.source.startsWith("src/lib/")) {
    replacements.set(change.source.replace(/^src/, "@"), change.target.replace(/^src/, "@"));
  }
}

const textFiles = [...TEXT_FILES.filter(fs.existsSync), ...TEXT_ROOTS.flatMap(root => walk(root, file => TEXT_EXT.test(file)))];
let updatedReferences = 0;
if (WRITE) {
  for (const change of changes) {
    if (change.buffer) {
      fs.writeFileSync(change.target, change.buffer);
      fs.unlinkSync(change.source);
    } else {
      fs.renameSync(change.source, change.target);
    }
  }
  for (const file of textFiles) {
    const oldText = fs.readFileSync(file, "utf8");
    let newText = oldText;
    for (const [from, to] of replacements) newText = newText.replaceAll(from, to);
    if (newText !== oldText) {
      fs.writeFileSync(file, newText);
      updatedReferences++;
    }
  }
}

const beforeTotal = changes.reduce((sum, item) => sum + item.before, 0);
const afterTotal = changes.reduce((sum, item) => sum + item.after, 0);
for (const item of changes) {
  const saving = Math.round((1 - item.after / item.before) * 100);
  console.log(`${WRITE ? "otimizado" : "converter"} ${item.source} -> ${path.basename(item.target)} (${saving}% menor, ${item.reason})`);
}
console.log(`${WRITE ? "resultado" : "prévia"}: ${changes.length} arquivos, ${(beforeTotal / 1048576).toFixed(2)} MB -> ${(afterTotal / 1048576).toFixed(2)} MB, ${updatedReferences} arquivos de texto atualizados`);
