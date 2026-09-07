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
  /* Galeria própria. Sem isto os dois combos dividiam as mesmas fotos, e
     trocar a do 2027 mudaria também a do vol.6. */
  galeria?: readonly string[];
  /* Descrição própria, pelo mesmo motivo: o texto vivia fixo no componente
     e servia aos dois combos, então o 2027 anunciava itens do vol.6. */
  descricao?: readonly Paragrafo[];
};

/* Um parágrafo da descrição. `forte` é o rótulo do item; `texto` o que vem
   embaixo dele. Só `forte` = linha em destaque; só `texto` = parágrafo comum. */
export type Paragrafo = { forte?: string; texto?: string };

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

/* Galeria própria do lançamento 2027. Antes ela reaproveitava as fotos do
   combo do vol.6 a partir da segunda posição, que mostravam produto
   diferente do anunciado. */
const galeria2027 = [
  "box2027-1.webp",
  "box-livro-1.webp",
  "box-livro-2.webp",
  "box-livro-3.webp",
  "box-livro-4.webp",
] as const;

const descricao2027: readonly Paragrafo[] = [
  { texto: "A nova Box Café com Deus Pai 2027 – Volume 7 foi pensada para tornar cada momento devocional ainda mais especial, reunindo fé, reflexão e a experiência de um bom café em uma seleção exclusiva de itens." },
  { texto: "Este combo especial inclui:" },
  { forte: "Livro Café com Deus Pai – Volume 7:", texto: "A nova edição do devocional Café com Deus Pai, com mensagens para acompanhar os 365 dias do ano, criando um momento diário de reflexão, fé e conexão com Deus." },
  { forte: "Livro de Oração:", texto: "Um livro especial em acabamento marrom, pensado para acompanhar seus momentos de oração e permitir que você registre pedidos, agradecimentos, reflexões e experiências ao longo da sua caminhada." },
  { forte: "Café Gourmet 250g:", texto: "Café 100% arábica, desenvolvido para acompanhar os seus momentos de leitura e reflexão com aroma e sabor especiais." },
  { forte: "Lata de Brownie:", texto: "Um toque doce para completar a experiência do seu Café com Deus Pai." },
  { forte: "Xícara personalizada com pires:", texto: "Uma xícara exclusiva Café com Deus Pai, criada para tornar o momento do café ainda mais especial." },
  { forte: "Copo personalizado:", texto: "Prático para levar sua bebida com você e manter o Café com Deus Pai presente também na rotina fora de casa." },
  { forte: "Ecobag exclusiva:", texto: "Uma bolsa personalizada, prática e versátil para acompanhar você no dia a dia." },
  { forte: "Marca-texto:", texto: "Ideal para destacar mensagens, passagens e reflexões que mais falarem ao seu coração durante a leitura." },
  { forte: "Marca-página exclusivo:", texto: "Para marcar suas leituras e acompanhar sua jornada durante todo o ano." },
  { forte: "Uma experiência completa" },
  { texto: "Cada item foi pensado para fazer parte de um mesmo ritual: preparar o café, abrir o devocional e separar alguns minutos do dia para estar com Deus." },
  { texto: "A Box Café com Deus Pai 2027 une leitura, oração e pequenos momentos de pausa em uma experiência especial para começar um novo ciclo." },
  { forte: "Detalhes:" },
  { texto: "- Autor: Junior Rostirola" },
  { texto: "- Editora: Vélos" },
  { texto: "- Edição: Volume 7" },
  { texto: "- Ano: 2027" },
  { texto: "- Idioma: Português" },
  { texto: "As imagens exibidas são meramente ilustrativas e têm o propósito de representar os produtos de forma aproximada. Cores, acabamentos, dimensões e detalhes dos itens podem apresentar pequenas variações." },
];

export const comboPlus2027: Produto = {
  nome: "Lançamento Combo Plus | 2027",
  breadcrumb: "Home | Lançamento | Combo Plus | 2027",
  imagem: `${assetRoot}/${galeria2027[0]}`,
  galeria: galeria2027,
  descricao: descricao2027,
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
