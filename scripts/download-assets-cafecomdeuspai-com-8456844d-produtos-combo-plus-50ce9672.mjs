import fs from 'node:fs/promises';
import path from 'node:path';

const root = 'public/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672';
const assets = {
  'logo.png': 'https://acdn-us.mitiendanube.com/stores/003/351/159/themes/common/logo-2004076481-1758203226-95e13973858f26ad55b5df03e1822b831758203227.png?0',
  'combo-main.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/7-1-d42c28beade6091f2d17828494458183-1024-1024.webp',
  'combo-2.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/copia-de-dsc00016-f7c466a20721d181bb17773181329200-1024-1024.webp',
  'combo-3.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/2-04944f96bf6728464217773184210745-1024-1024.webp',
  'combo-4.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/copia-de-dsc09966-2-40186ee7bd47c11feb17773181317206-480-0.webp',
  'combo-5.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/159-0c74b8c917df6d427e17836857818372-480-0.webp',
  'combo-6.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/copia-de-dsc00001-20f7092bd50e4381e117773181327556-480-0.webp',
  'combo-7.webp': 'https://acdn-us.mitiendanube.com/stores/003/351/159/products/56-e49d7f393924f4230617773182155155-480-0.webp',
};

await fs.mkdir(root, { recursive: true });
for (const [name, url] of Object.entries(assets)) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await fs.writeFile(path.join(root, name), Buffer.from(await response.arrayBuffer()));
}
