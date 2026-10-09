// Libera o conteúdo durante a leitura do HTML, antes da hidratação do React.
// A identificação do aparelho continua sendo feita pelo rastreamento, sem
// alterar a navegação de quem acessa pelo computador.
export const SCRIPT_ACESSO_INICIAL = `(()=>{
  document.documentElement.dataset.cdpAcesso='liberado';
})();`;
