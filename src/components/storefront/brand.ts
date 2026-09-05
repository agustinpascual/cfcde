/* ============================================================
   ARQUIVO ÚNICO DE IDENTIDADE.
   Tudo que é "marca" mora aqui: nome, menu, produtos, rodapé.
   Os componentes da vitrine leem daqui — troque este arquivo
   (e os tokens --sf-* em globals.css) e a loja inteira muda.
   ============================================================ */

export const marca = {
  nome: "Café com Deus Pai",
  /* O Header da vitrine desenha o nome como wordmark; as telas da loja usam
     o PNG abaixo (mesmo arquivo do favicon e dos ícones do app). */
  logo: "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png" as string | null,
  tagline: "Devocionais, canecas, cafés e combos para começar o dia com Deus.",
  whatsapp: "554732249292",
};

export const avisoTopo = "Espaço para o aviso do topo — frete, cupom ou prazo";

export const menu = [
  { rotulo: "Lançamentos", href: "#lancamentos" },
  { rotulo: "Mais vendidos", href: "#destaques" },
  { rotulo: "Combos", href: "#combos" },
  { rotulo: "Sobre", href: "/sobre" },
  { rotulo: "Contato", href: "/contato" },
];

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  precoDe?: number;
  selo?: string;
  parcelas?: string;
};

/* Placeholders. Substitua pelo catálogo real — ou plugue no
   banco/API e remova esta constante. */
export const produtos: Produto[] = [
  { id: "p1", nome: "Nome do produto 01", preco: 89.9, precoDe: 119.9, selo: "Lançamento", parcelas: "4x de R$22,48" },
  { id: "p2", nome: "Nome do produto 02", preco: 129.9, selo: "Lançamento", parcelas: "4x de R$32,48" },
  { id: "p3", nome: "Nome do produto 03", preco: 59.9, precoDe: 79.9, parcelas: "4x de R$14,98" },
  { id: "p4", nome: "Nome do produto 04", preco: 179.9, selo: "Combo", parcelas: "4x de R$44,98" },
  { id: "p5", nome: "Nome do produto 05", preco: 99.9, parcelas: "4x de R$24,98" },
  { id: "p6", nome: "Nome do produto 06", preco: 149.9, precoDe: 199.9, selo: "Oferta", parcelas: "4x de R$37,48" },
];

export const heroSlides = [
  { id: "s1", titulo: "Chamada principal da campanha", texto: "Uma linha de apoio explicando a oferta", cta: "Comprar agora", href: "#lancamentos" },
  { id: "s2", titulo: "Segunda chamada", texto: "Outra mensagem que entra em rotação", cta: "Conheça", href: "#destaques" },
  { id: "s3", titulo: "Terceira chamada", texto: "Espaço para prova social ou novidade", cta: "Ver mais", href: "#combos" },
];

export const rodape = {
  colunas: [
    { titulo: "Atendimento", links: [
      { rotulo: "Fale conosco", href: "/contato" },
      { rotulo: "Dúvidas frequentes", href: "/duvidas-frequentes" },
      { rotulo: "Prazo de entrega", href: "/duvidas-frequentes" },
    ]},
    { titulo: "Institucional", links: [
      { rotulo: "Sobre nós", href: "/sobre" },
      { rotulo: "Nossa história", href: "/sobre" },
    ]},
    { titulo: "Políticas", links: [
      { rotulo: "Trocas e devoluções", href: "/politica-de-privacidade" },
      { rotulo: "Privacidade e segurança", href: "/politica-de-privacidade" },
    ]},
  ],
  /* Preencha com os dados reais da empresa antes de publicar. */
  razaoSocial: "Razão social · CNPJ 00.000.000/0001-00",
  pagamentos: ["Pix", "Visa", "Master", "Elo", "Amex", "Boleto"],
};
