import type { FooterColumn, Kit, NavItem, Review } from "./types";

export const IMG = "/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images";

export const countdownMessage = "PARTICIPE DA REGUA DE BRINDES NAS COMPRAS ACIMA DE 300,00 REAIS";

export const nav: NavItem[] = [
  { label: "Todas Categorias", dropdown: true },
  { label: "RELÂMPAGO" },
  { label: "Seja um afiliado(a)" },
  { label: "Avaliações" },
  { label: "Kits promocionais" },
];

export const categorias = [
  "RELÂMPAGO", "Seja um afiliado(a)", "Avaliações", "Kits promocionais", "Todos os produtos",
  "Wellness - saúde física, mental e emocional", "Emagrecimento", "Beleza e autocuidado",
  "Academia", "Kit teste", "ACESSÓRIOS", "PÓS EMAGRECIMENTO",
];

/* ---------- Produto ---------- */
export const produto = {
  nome: "Mounja Gummy",
  nota: "5.0",
  avaliacoes: 39,
  de: "R$149,90",
  por: "R$89,90",
  pix: "R$89,90 com PIX",
  economia: "Economia de R$60,00 (40%)",
  disponibilidade: "Disponível em 5 dias úteis",
  estoque: 13,
  galeria: [
    { thumb: `${IMG}/imag1.png`, full: `${IMG}/imag1.png`, ratio: 1 },
    { thumb: `${IMG}/imag2.webp`, full: `${IMG}/imag2.webp`, ratio: 1 },
    { thumb: `${IMG}/imag3.webp`, full: `${IMG}/imag3.webp`, ratio: 1 },
    { thumb: `${IMG}/imag4.webp`, full: `${IMG}/imag4.webp`, ratio: 1 },
  ],
};

export const kitsTitle = "Escolha o seu KIT IDEAL para o seu tratamento";

export const kits: Kit[] = [
  {
    nome: "1 POTE", duracao: "DURAÇÃO DE 2 MESES", descricao: " ", de: null,
    total: "R$ 89,90", unidade: "R$ 89,90", economia: null,
    desconto: null, imagem: `${IMG}/imag1.png`, ativo: true,
  },
  {
    nome: "2 POTES", duracao: "DURAÇÃO DE 4 MESES", descricao: "1 fita métrica", de: "R$ 179,80",
    total: "R$ 119,90", unidade: "R$ 59,95", economia: "Economia de R$ 59,90",
    desconto: "33% OFF", imagem: `${IMG}/image2prod.png`, ativo: false, recomendado: true,
  },
  {
    nome: "3 POTES", duracao: "DURAÇÃO DE 6 MESES", descricao: "1 fita métrica 1 ebook com protocolo alimentar",
    de: "R$ 269,70", total: "R$ 149,90", unidade: "R$ 49,97", economia: "Economia de R$ 119,80",
    desconto: "44% OFF", imagem: `${IMG}/imag3prod.png`, ativo: false,
  },
];

/* ---------- Card de descrição — Mounja Gummy ----------
   Texto escrito para suplemento alimentar sob as regras da RDC 243/2018 (ANVISA):
   descreve formato, apresentação e orientação de uso, sem alegação terapêutica,
   sem promessa de resultado e sem comparação com medicamento.
   Os números marcados como (conferir rótulo) precisam bater com a embalagem real. */
export const descricao = {
  badge: "Bela Blue Beauty",
  tituloA: "MOUNJA",
  tituloB: "GUMMY",
  subtitulo: "Suplemento alimentar em gomas mastigáveis",
  linha: "LINHA GUMMY",
  headline: "A praticidade de uma goma para uma rotina que não para",
  intro: {
    antes: "O ",
    forte: "Mounja Gummy",
    depois:
      " é o suplemento alimentar da Bela Blue Beauty apresentado em gomas mastigáveis. Foi desenvolvido para quem quer manter a suplementação em dia sem depender de água, cápsula ou preparo — basta abrir o pote e consumir a porção indicada no rótulo.",
  },
  specs: ["60 gomas (conferir rótulo)", "Sabor frutas vermelhas", "Uso conforme rótulo"],
  cards: [
    {
      n: "01",
      titulo: "Formato em gomas",
      texto: "Mastigável e sem necessidade de água, para encaixar a suplementação em qualquer horário do dia.",
    },
    {
      n: "02",
      titulo: "Produção controlada",
      texto: "Fabricado em unidade licenciada, seguindo as Boas Práticas de Fabricação exigidas para suplementos alimentares.",
    },
    {
      n: "03",
      titulo: "Rotina simplificada",
      texto: "Porção diária definida em rótulo, o que facilita manter a constância ao longo do tratamento.",
    },
  ],
  blocos: [
    {
      titulo: "Como consumir",
      texto:
        "Consuma a porção diária indicada no rótulo do produto, preferencialmente no mesmo horário para ajudar na constância. Não exceda a recomendação diária. O produto não substitui uma alimentação equilibrada e seu consumo deve estar associado a hábitos saudáveis e à prática de atividade física.",
    },
    {
      titulo: "Composição e informação nutricional",
      texto:
        "A lista completa de ingredientes, a informação nutricional, a porção recomendada, os alérgenos e as condições de conservação estão descritos no rótulo da embalagem. Consulte-os antes do consumo, sobretudo em caso de restrição alimentar ou alergia.",
    },
    {
      titulo: "Conservação",
      texto:
        "Mantenha o pote bem fechado, em local seco, fresco e ao abrigo da luz solar direta. Após aberto, consuma dentro do prazo indicado na embalagem.",
    },
  ],
  aviso: {
    titulo: "Informação importante",
    texto:
      "Este produto é um suplemento alimentar e não é medicamento. Não possui e não pretende ter finalidade de prevenir, tratar ou curar doenças. Não deve ser consumido por gestantes, lactantes, menores de 19 anos ou pessoas com doenças preexistentes sem orientação de médico ou nutricionista. Em caso de dúvida, procure um profissional de saúde.",
  },
};

/* ---------- Avaliações ---------- */
/* 37 avaliações reais extraídas do carrossel .native-reviews-product do original. */
export const reviews: Review[] = [
  { autor: "Adelir Rodrigues", data: "08/06/2026", estrelas: 5, texto: "Maravilhoso melhor de todos" },
  { autor: "Ana Paula", data: "09/01/2026", estrelas: 5, texto: "Gosto, da rapidez bela está de parabéns pelos produtos, pela Laís vendedora Laís que é maravilhosa! 😍❤️👏🏽" },
  { autor: "SALETE TERESINHA", data: "05/01/2026", estrelas: 5, texto: "Produto muito eficiente obtendo resultados nos 1° dias", foto: `${IMG}/37-avalia-o-de-salete-teresinha.jpg` },
  { autor: "Ellen Cristina", data: "19/12/2025", estrelas: 5, texto: "Produto entrega o prometido e o atendimento é top ... Super recomendo ambos 😻" },
  { autor: "Susana", data: "19/12/2025", estrelas: 5, texto: "Produto maravilhoso! Realmente entrega o que promete! Perdi em 6 dias 3 kg … reduz muito o apetite!" },
  { autor: "Franciele Cardozo", data: "18/12/2025", estrelas: 5, texto: "Já testei que resultado imediato. Estou encantada com esse Power." },
  { autor: "Vanessa Dias", data: "18/12/2025", estrelas: 5, texto: "Tive um resultado jamais visto , emagreci 1kilos no primeiro dia , no segundo dia não tomei e ele manteve agindo no meu organismo ele é incrível meu novo favorito" },
  { autor: "Kelly Di", data: "17/12/2025", estrelas: 5, texto: "Depois que eu descobri essa maravilha zero compulsão ✅ zero fome ✅ Agora é muito mais fácil eliminar as gordurinhas ❤️🥰" },
  { autor: "Rusceline pinto", data: "17/12/2025", estrelas: 5, texto: "Muito bom fique sem sentir fome Tomei 3 cápsulas emagreci 2kl." },
  { autor: "Andreza lorrana", data: "17/12/2025", estrelas: 5, texto: "Produto está sendo o melhor da bela resultado que a gente fica de boca aberta - 3 a 4 kg em 2 dias visível em medidas e peso na balança é top o melhor já lançado" },
  { autor: "Francielli", data: "17/12/2025", estrelas: 5, texto: "Nossa eu tomei ele durante 3 dias 😱 fiquei admirada com a energia e disposição que eu tive com ele e fora que um resultado incrível em apenas 3 dias , desinchou muito e fome zero tive que forçar comer , tô ansiosa para o lançamento, melhor emagrecedor com certeza ❤️" },
  { autor: "Maira rocha", data: "17/12/2025", estrelas: 5, texto: "Nossa ele muito forteeeee , muito bom eu elimei 3 kilos em 3 dias , eu fiquei impactada pq realmente tirou minha fome, super recomendo já tomei todos o melhor mais forte é bela power." },
  { autor: "Rita Daiana", data: "17/12/2025", estrelas: 5, texto: "Ótimo produto pra quem quer um emagrecimento rápido e eficaz..Super recomendo 🤗🙏" },
  { autor: "Andressa Karine", data: "17/12/2025", estrelas: 5, texto: "Ele é fantástico, embora um pouco forte nos primeiros dias ele entrega demaisssss o que promete. Comprarei mais vezes" },
  { autor: "Eloane chiossi", data: "17/12/2025", estrelas: 5, texto: "Produto maravilhoso, mudou a minha vida, nunca conseguia emagrecer e com esse maravilhoso consegui perder 2kg em um dia 😍, não sinto fome, perfeito!" },
  { autor: "Kamylee", data: "17/12/2025", estrelas: 5, texto: "Meninas simplesmente perfeitoooo, não estava preparada para os resultados que estou tendo e sinceramente não vou mais ficar sem🥰🥰🥰" },
  { autor: "Thays", data: "17/12/2025", estrelas: 5, texto: "O melhor emagrecedor que a Bela já fez, estava estagnada de peso e com ele já foi -3kg em 3 dias, Zero fome, tem que comer pra não passar mal, mas vontade mesmo é nenhuma. Achei incrível 😍" },
  { autor: "Nani", data: "17/12/2025", estrelas: 5, texto: "Excelente produto, cumpre com oque promete!" },
  { autor: "Daiana cordova", data: "16/12/2025", estrelas: 5, texto: "Um produto top demais forte pra quem busca resultados 2kilos em 3 dias superou minhas expectativas de verdade" },
  { autor: "Regiane", data: "16/12/2025", estrelas: 5, texto: "Produto cumpre o que promete. Entrega muito resultado!" },
  { autor: "CRISTIANE VALCANAYA", data: "16/12/2025", estrelas: 5, texto: "Ele é maravilhoso, produto top mesmo, e chegou rápidinho." },
  { autor: "Ivana Miranda", data: "16/12/2025", estrelas: 5, texto: "Maravilhoso tirou completamente minha compulsão por beliscari , por doces.., cortou … emagreci rapidinho três quilos!Ameiiiii" },
  { autor: "Maria Aparecida", data: "16/12/2025", estrelas: 5, texto: "Maravilhoso genteeeee só comprem amando os resultados em 3 dias já foram 4 kg em breve voltarei aqui e conto mais❤️❤️❤️esse Bella Power Black é porretaaa." },
  { autor: "Bianca", data: "16/12/2025", estrelas: 5, texto: "Inibidor power mesmo… zero fome e muitos kilos a menos!!! Os efeitos colaterais “negativos” valem a pena cada kg eliminado 🤩" },
  { autor: "Anderson Freitas", data: "16/12/2025", estrelas: 5, texto: "O emagrecedor mais potente dos últimos tempos!! Dois dias baixei 4kg!!! Incrível essas cápsulas." },
  { autor: "Sara Guedes", data: "16/12/2025", estrelas: 5, texto: "Muito bom ! Zero fome, bastante sede e muito xixi." },
  { autor: "Daiana", data: "16/12/2025", estrelas: 5, texto: "Produto muito booom zero fome, realmente amei 😍🥰" },
  { autor: "Michele Loh", data: "16/12/2025", estrelas: 5, texto: "Tomei somente três cápsulas do kit teste, eliminei 1,700kg nesses dias que tomei. Estou ansiosa para o lançamento!" },
  { autor: "Vivi Schaefer", data: "16/12/2025", estrelas: 5, texto: "Superou todas as minhas expectativas. Ele cumpre além do que promete. Nossa! Eu amei!" },
  { autor: "Maria luiza", data: "16/12/2025", estrelas: 5, texto: "Recebi o produto muito rápido, e ele é perfeito! Resultado em 1 dia de uso 🥰🥰" },
  { autor: "CARINI LONGEN", data: "16/12/2025", estrelas: 5, texto: "Ele é maravilhosa bem do jeito que eu gosto, apenas 1 cápsula conseguir perder -3kg na balança ajuda muito na retenção de líquidos eu super amei já estou esperando meu potinho para fazer o tratamento" },
  { autor: "Flavia Marins", data: "16/12/2025", estrelas: 5, texto: "Incrível! Três dias quase 4kg😃🤩 Surreal!" },
  { autor: "Liliane Nazaré", data: "16/12/2025", estrelas: 5, texto: "Gostei bastante do produto me surpreendeu ele é forte já na primeira cápsula vc já sente que ele realmente inibe o apetite." },
  { autor: "Andressa", data: "16/12/2025", estrelas: 5, texto: "Produto muito eficaz! Cumpre oque promete já foram 2kg em 3 dias" },
  { autor: "Naiara Almeida", data: "15/12/2025", estrelas: 5, texto: "Fantástico sacia demais o apetite e em um dia faz liberar 2kgs espetacular 🥳" },
  { autor: "Aniely Marujo", data: "15/12/2025", estrelas: 5, texto: "Power Black entregou o que prometeu Com 3 cápsulas foram embora 3,100kg Amando o resultado! Muito xixi, é zero fome" },
  { autor: "Patrícia", data: "15/12/2025", estrelas: 5, texto: "Meu segundo dia usando o produto! Zero fome e um pouco de enjoo,mas tudo na normalidade! SUPER APROVADO" },
];

export const resumoAvaliacoes = {
  media: 5.0,
  total: 37,
  /* todas as avaliações publicadas no original são 5 estrelas */
  distribuicao: { 5: 37, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
};

export const topVendasLabel = "TOP ENTRE OS PRODUTOS MAIS VENDIDOS";

/* ---------- Faixa de benefícios ---------- */
export const alerts = [
  { img: `${IMG}/43-parcele-suas-compras-b-em-at-12x.png`, texto: "Parcele suas compras", forte: "em até 12x no cartão" },
  { img: `${IMG}/44-produtos-com-b-pronta-entrega-b-.png`, texto: "Produtos com", forte: "pronta entrega" },
  { img: `${IMG}/45-compre-e-ganhe-brindes-b-acumulat.png`, texto: "Compre e ganhe brindes", forte: "acumulativos" },
  { img: `${IMG}/46-frete-gr-tis-em-compras-b-acima-d.png`, texto: "Frete Grátis em compras", forte: "acima de R$ 399" },
];

/* ---------- Rodapé ---------- */
export const footerColumns: FooterColumn[] = [
  { title: "Categorias", links: categorias.map((c) => ({ label: c })) },
  { title: "Institucional", links: [
    { label: "Nosso blog" }, { label: "Catálogos" },
    { label: "TRABALHE CONOSCO" }, { label: "Seja afiliado" },
    { label: "Nossas lojas" },
  ] },
  { title: "Ajuda e Suporte", links: [
    { label: "Fale Conosco" }, { label: "Política de privacidade" },
    { label: "Dúvidas frequentes" }, { label: "POLÍTICA DE TROCA E DEVOLUÇÃO" },
    { label: "RASTREIE SEU PEDIDO" }, { label: "Meus pedidos" },
  ] },
];

export const bandeiras = [
  { img: `${IMG}/50-page-com-mercado-pago.png`, alt: "Page com Mercado Pago", w: 58 },
  { img: `${IMG}/51-page-com-pagar.me.png`, alt: "Page com Pagar.me", w: 58 },
  { img: `${IMG}/52-visa.png`, alt: "Visa", w: 39 },
  { img: `${IMG}/53-mastercard.png`, alt: "MasterCard", w: 39 },
  { img: `${IMG}/54-hipercard.png`, alt: "Hipercard", w: 39 },
  { img: `${IMG}/55-american-express.png`, alt: "American Express", w: 39 },
  { img: `${IMG}/56-diners.png`, alt: "Diners", w: 39 },
  { img: `${IMG}/57-elo.png`, alt: "Elo", w: 39 },
  { img: `${IMG}/58-boleto.png`, alt: "Boleto", w: 39 },
  { img: `${IMG}/59-discover.png`, alt: "Discover", w: 39 },
  { img: `${IMG}/60-aura.png`, alt: "Aura", w: 39 },
  { img: `${IMG}/61-pix.png`, alt: "PIX", w: 39 },
];

export const whatsapp = {
  href: "https://api.whatsapp.com/send?phone=5547997036656&text=Olá, vim do site da Bela Blue Beauty, e gostaria de tirar dúvidas!",
  img: `${IMG}/64-estou-online-no-whatsapp.png`,
};

export const chatBela = { texto: "Olá! Sou a Bela, vamos conversar?", avatar: `${IMG}/65-wbuy_ai-icon.jpeg` };

/* ---------- Prova social: nomes e cidades para as notificações de compra ---------- */
export const nomesFemininos = [
  "Ana", "Maria", "Juliana", "Fernanda", "Camila", "Patrícia", "Larissa", "Beatriz",
  "Gabriela", "Aline", "Carla", "Vanessa", "Priscila", "Bruna", "Tatiane", "Renata",
  "Débora", "Simone", "Letícia", "Amanda", "Jéssica", "Mariana", "Rafaela", "Cristiane",
  "Sabrina", "Luciana", "Elaine", "Michele", "Adriana", "Viviane", "Daniela", "Roberta",
];

export const nomesMasculinos = [
  "João", "Carlos", "Pedro", "Lucas", "Rafael", "Bruno", "Felipe", "Marcos",
  "Thiago", "Rodrigo", "Anderson", "Gustavo", "Eduardo", "Daniel", "Ricardo", "Fernando",
  "Leonardo", "Vinícius", "Alexandre", "Douglas", "Matheus", "Everton", "Wagner", "Cláudio",
  "Márcio", "Diego", "Fábio", "Renato", "Sérgio", "Alan", "Vitor", "Guilherme",
];

export const sobrenomes = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues",
  "Almeida", "Nascimento", "Carvalho", "Araújo", "Ribeiro", "Ferreira", "Gomes",
  "Martins", "Rocha", "Barbosa", "Alves", "Monteiro", "Cardoso", "Teixeira",
];

export const cidades = [
  "São Paulo - SP", "Rio de Janeiro - RJ", "Belo Horizonte - MG", "Curitiba - PR",
  "Porto Alegre - RS", "Salvador - BA", "Fortaleza - CE", "Recife - PE",
  "Brasília - DF", "Manaus - AM", "Goiânia - GO", "Belém - PA",
  "Florianópolis - SC", "Vitória - ES", "Natal - RN", "João Pessoa - PB",
  "Maceió - AL", "Campo Grande - MS", "Cuiabá - MT", "Teresina - PI",
  "São Luís - MA", "Aracaju - SE", "Joinville - SC", "Campinas - SP",
  "Uberlândia - MG", "Blumenau - SC", "Londrina - PR", "Ribeirão Preto - SP",
  "Sorocaba - SP", "Caxias do Sul - RS", "Niterói - RJ", "Santos - SP",
  "Juiz de Fora - MG", "Feira de Santana - BA", "Chapecó - SC", "Itajaí - SC",
  "Balneário Camboriú - SC", "Criciúma - SC", "Maringá - PR", "Cascavel - PR",
  "Bauru - SP", "Piracicaba - SP", "Petrolina - PE", "Anápolis - GO",
];

/* variações de kit que aparecem na notificação */
export const kitsCompra = ["1 pote", "2 potes", "3 potes"];

/* ---------- Frete ---------- */
/* Valores fixos para todo o Brasil — não variam por região. */
export const opcoesFrete = [
  { id: "prioritario", nome: "Envio Prioritário", preco: 19.9, min: 5, max: 8, destaque: true },
  { id: "economico", nome: "Econômico", preco: 0, min: 10, max: 15, destaque: false },
] as const;

export type OpcaoFrete = (typeof opcoesFrete)[number];
