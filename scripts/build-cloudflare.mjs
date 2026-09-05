/* Build para a Cloudflare sem levar segredo junto.

   O OpenNext varre .env, .env.local e .env.<modo>.local e grava TUDO dentro
   do código do Worker (cli/utils/extract-project-env-vars.js), nos três modos.
   Como o .env.local guarda as credenciais que o `next dev` precisa, ele é
   afastado só durante o build e devolvido no fim, aconteça o que acontecer.

   O que o build legitimamente precisa fica no .env.production.local, que só
   tem variáveis públicas (NEXT_PUBLIC_*). Os segredos entram em runtime pelos
   secrets da Cloudflare — e vencem, porque o init.js usa `??=`. */

import { execFileSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";

const ORIGINAL = ".env.local";
const GUARDADO = ".env.local.durante-build";

const precisaEsconder = existsSync(ORIGINAL);
if (precisaEsconder) renameSync(ORIGINAL, GUARDADO);

/* O finally cobre erro de build e Ctrl+C: sem isto um build interrompido
   deixaria o dev local sem .env.local e sem explicação. */
const devolver = () => { if (precisaEsconder && existsSync(GUARDADO)) renameSync(GUARDADO, ORIGINAL); };
process.on("SIGINT", () => { devolver(); process.exit(130); });
process.on("SIGTERM", () => { devolver(); process.exit(143); });

try {
  execFileSync("npx", ["opennextjs-cloudflare", "build", ...process.argv.slice(2)], { stdio: "inherit" });
} finally {
  devolver();
}
