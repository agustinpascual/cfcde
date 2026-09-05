import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/* Cache incremental/tag/fila ficam no padrão ("dummy"): o site não usa ISR.
   Para ligar cache em R2 depois, veja https://opennext.js.org/cloudflare/caching */
export default {
  ...defineCloudflareConfig(),
  /* Sem isto o build entra em recursão infinita: o OpenNext roda
     `npm run build` para compilar o Next (buildNextApp.js), e o script
     "build" do package.json é o próprio `opennextjs-cloudflare build`.
     Cada passada abre outra, até a máquina travar — chegou a 97 processos
     e 11,5 GB de RAM aqui. Apontando direto para o `next build` o ciclo
     se fecha na primeira volta. */
  buildCommand: "next build",
};
