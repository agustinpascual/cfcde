/* Fonte única dos produtos que usam esta tela. Galeria, sacola, notificação de
   compra e barra mobile leem daqui — trocando a primeira imagem da galeria,
   troca em todos os lugares. */
export const assetRoot = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672";

export const galeria = [
  "combo-main.webp",
  "combo-2.webp",
  "combo-3.webp",
  "combo-4.webp",
  "combo-5.webp",
  "combo-6.webp",
  "combo-7.webp",
];

/* Cada oferta é um pacote fechado: o preço é do pacote inteiro, não por
   unidade. `comparado` é o valor riscado — só existe quando há uma
   comparação real (aqui, o que custaria comprando as unidades avulsas). */
export type Oferta = {
  unidades: number;
  rotulo: string;
  preco: number;
  comparado?: number;
  /* Identifica o pacote no checkout e na tabela de preços do servidor. */
  slug: string;
};

export type Produto = {
  nome: string;
  breadcrumb: string;
  imagem: string;
  ofertas: Oferta[];
};

export const moeda = (valor: number) => `R$${valor.toFixed(2).replace(".", ",")}`;

export const parcelas = (valor: number) => `4 x de ${moeda(valor / 4)} sem juros`;

export const desconto = (oferta: Oferta) =>
  oferta.comparado ? Math.round((1 - oferta.preco / oferta.comparado) * 100) : 0;

export const comboPlus: Produto = {
  nome: "Combo Plus | Frete grátis",
  breadcrumb: "Home | Lançamento | Combo Plus | Frete Grátis",
  imagem: `${assetRoot}/${galeria[0]}`,
  ofertas: [{ unidades: 1, rotulo: "1 unidade", preco: 289.9, comparado: 513.9, slug: "combo-plus" }],
};

export const comboPlus2027: Produto = {
  nome: "Lançamento Combo Plus | 2027",
  breadcrumb: "Home | Lançamento | Combo Plus | 2027",
  imagem: `${assetRoot}/${galeria[0]}`,
  /* O valor riscado é o preço cheio do Combo Plus (R$289,90 por unidade):
     289,90 para uma e 579,80 para o par. */
  ofertas: [
    { unidades: 1, rotulo: "1 unidade", preco: 89.9, comparado: 289.9, slug: "combo-plus2027" },
    { unidades: 2, rotulo: "2 unidades", preco: 129.9, comparado: 579.8, slug: "combo-plus2027-2un" },
  ],
};

/* O checkout recebe só o slug do pacote; daqui ele tira nome, foto e valor. */
export const OFERTAS_POR_SLUG = Object.fromEntries(
  [comboPlus, comboPlus2027].flatMap((item) =>
    item.ofertas.map((oferta) => [
      oferta.slug,
      {
        slug: oferta.slug,
        name: oferta.unidades > 1 ? `${item.nome} · ${oferta.rotulo}` : item.nome,
        image: item.imagem,
        priceCents: Math.round(oferta.preco * 100),
        originalPrice: oferta.comparado ? moeda(oferta.comparado) : null,
      },
    ]),
  ),
);
