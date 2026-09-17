import { detectarDispositivo, DISPOSITIVOS_LOJA } from "./dispositivos";

export const DESTINO_COMPUTADOR = "https://cafecomdeus.blog.br/";

// Executa durante a leitura do HTML, sem esperar React e os chunks da loja.
// O detector é o mesmo usado após a hidratação, inclusive para iPadOS.
export const SCRIPT_ACESSO_INICIAL = `(()=>{
  const n=navigator;
  const tipo=(${detectarDispositivo.toString()})(n.userAgent,n.userAgentData?.platform||n.platform,n.maxTouchPoints);
  const permitido=${JSON.stringify(DISPOSITIVOS_LOJA)}.includes(tipo);
  document.documentElement.dataset.cdpAcesso=permitido?'liberado':'bloqueado';
  const painel=location.pathname==='/ioh3j4ciof3n3oic'||location.pathname.startsWith('/ioh3j4ciof3n3oic/');
  if(!permitido&&!painel) location.replace(${JSON.stringify(DESTINO_COMPUTADOR)});
})();`;
