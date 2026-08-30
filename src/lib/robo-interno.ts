import "server-only";

/* Motor de resposta local, sem IA.
   Casa a mensagem do cliente com intenções conhecidas por sobreposição de
   palavras. Quando a confiança é baixa, escala para um humano em vez de
   responder errado.

   As respostas seguem a política de atendimento do Mounja Gummy, que existe
   por causa da Resolução-RE nº 3.242/2026 da Anvisa: o produto não tem
   registro, notificação nem cadastro na Agência, e estão proibidas
   fabricação, venda, distribuição, importação e divulgação.

   Assunto regulatório não é respondido pelo robô: vai para atendimento humano.
   Não responder é diferente de afirmar o contrário — nenhuma resposta aqui diz
   que o produto tem registro, é aprovado ou é seguro, porque seria falso.

   Este motor também NÃO informa preço, frete, forma de pagamento nem modo de
   uso, e nunca afirma eficácia. Nada aqui deve ser religado a `kits`,
   `opcoesFrete` ou a qualquer dado comercial da loja. */

/* ---------- normalização ---------- */
const SEM_ACENTO = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const VAZIAS = new Set([
  "a","o","as","os","um","uma","de","do","da","dos","das","em","no","na","nos","nas",
  "por","para","pra","pro","com","sem","e","ou","que","se","ao","aos","à","às","é",
  "eu","voce","vc","tu","meu","minha","seu","sua","me","te","lhe","isso","isto","esse",
  "essa","este","esta","ai","la","aqui","ja","mais","muito","bem","so","tem","ter",
  "vai","vou","quero","queria","gostaria","pode","poderia","ser","sao","the","oi","ola",
  "qual","quais","quem","onde","porque","porquê","pq",
]);

function fichas(texto: string): string[] {
  return SEM_ACENTO(texto.toLowerCase())
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !VAZIAS.has(p));
}

/* Radical simples do português: junta plural e gênero para que "diabetica"
   e "diabetico", "goma" e "gomas" caiam no mesmo token. */
function radical(p: string): string {
  let r = p
    .replace(/(coes|cao)$/, "ca")
    .replace(/(oes|aes|ais|eis)$/, "l")
    .replace(/s$/, "")
    .replace(/(mente|ndo|ram|rei|ria|vel)$/, "");
  if (r.length > 5) r = r.replace(/[aoe]$/, "");
  return r;
}

const conjunto = (t: string) => new Set(fichas(t).map(radical));

/* "oi" e "olá" caem fora do matcher: têm 2 letras e estão entre as palavras
   vazias, então a mensagem chega sem nenhum token e vira encaminhamento.
   Uma saudação curta e sozinha é resolvida antes da pontuação. */
const SAUDACOES =
  /^(oi+|ol[aá]+|opa+|e a[ií]|eae|salve|hey|hi|hello|bom dia|boa tarde|boa noite|tudo bem|tudo bom|blz|beleza|bao)[\s,!.?]*/;

/** Tira a saudação do começo e devolve o que sobrou de assunto. */
function semSaudacao(mensagem: string): string {
  let t = SEM_ACENTO(mensagem.toLowerCase()).replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  // "oi, boa tarde, qual o sabor" tem duas saudações antes do assunto
  for (let i = 0; i < 3 && SAUDACOES.test(t); i++) t = t.replace(SAUDACOES, "").trim();
  return t;
}

/* Só é saudação pura quando NADA sobra depois de tirá-la. Antes bastava
   começar com "oi" e ter até 4 palavras, e "oi, qual o sabor?" era respondido
   com "Olá! Em que posso ajudar?" em vez do sabor. */
function ehSaudacaoPura(mensagem: string): boolean {
  const limpo = SEM_ACENTO(mensagem.toLowerCase()).replace(/[^\w\s]/g, " ").trim();
  if (!limpo) return false;
  return SAUDACOES.test(limpo) && semSaudacao(mensagem).length === 0;
}

/* ---------- intenções embutidas ---------- */
export type Intencao = {
  id: string;
  gatilhos: string[];      // frases/palavras que apontam para esta intenção
  resposta: () => string;
  escalar?: boolean;
  /* `critico` nunca chega na IA: a resposta tem que ser sempre a mesma,
     palavra por palavra. Saúde e reclamação não são lugar para criatividade.
     Um `escalar` sem `critico` a IA ainda pode tentar responder melhor. */
  critico?: boolean;
};

/* Frase única de encaminhamento, para o robô não improvisar despedida. */
const ENCAMINHA =
  "Entendo! 🙏 Esse assunto é tratado diretamente pelo setor responsável.\n\n" +
  "Vou te encaminhar agora para alguém que pode te informar corretamente.";

const INTERNAS: Intencao[] = [
  /* --- SAÚDE PRIMEIRO ---
     Ordem importa: no empate vence quem vem antes. Condição, sintoma e nome de
     medicamento têm que sair daqui, nunca de "modo de uso". */
  {
    id: "saude",
    gatilhos: [
      // estados e públicos
      "gravida", "gravidez", "gestante", "amamentando", "amamenta", "lactante",
      "crianca", "menor", "adolescente", "idoso",
      // condições
      "diabete", "diabetico", "pressao", "hipertenso", "hipertensao", "hipotireoidismo",
      "tireoide", "tiroide", "refluxo", "gastrite", "renal", "figado", "hepatico",
      "cardiaco", "coracao", "arritmia", "epilepsia", "depressao", "bariatrica",
      "cirurgia", "anemia", "colesterol", "doenca", "condicao",
      // sintomas
      "insonia", "taquicardia", "palpitacao", "tontura", "enjoo", "azia",
      "diarreia", "alergia", "alergico", "intolerancia",
      // medicamentos e princípios ativos
      "remedio", "medicamento", "anticoncepcional", "antidepressivo", "fluoxetina",
      "sertralina", "sibutramina", "levotiroxina", "metformina", "insulina",
      "losartana", "anticoagulante", "interacao",
      // formulações comuns da pergunta
      "posso tomar", "posso usar", "faz mal se", "ataca",
    ],
    resposta: () =>
      "Entendo a sua preocupação, e ela é super válida. 🙏\n\n" +
      "Justamente por envolver saúde, essa é uma resposta que precisa vir de um " +
      "profissional — eu não quero te passar nada impreciso sobre isso.\n\n" +
      "Vou te encaminhar agora para o setor responsável, tudo bem?",
    escalar: true,
    critico: true,
  },
  {
    id: "sabor",
    gatilhos: ["sabor", "gosto", "sabores", "tangerina", "limao", "doce", "azedo"],
    resposta: () => "Claro! 😊 O sabor é *tangerina com limão* — bem cítrico e leve.\n\n" +
      "Quer saber mais alguma coisa sobre o produto?",
  },
  {
    id: "restricoes",
    gatilhos: ["gluten", "lactose", "vegano", "vegetariano", "acucar", "zero acucar", "celiaco", "restricao"],
    resposta: () =>
      "Ótima pergunta! A embalagem traz a informação *sem glúten*.\n\n" +
      "Sobre qualquer outra restrição alimentar, prefiro não afirmar sem a " +
      "documentação em mãos — você merece a informação exata, não um palpite.\n\n" +
      "Quer que eu confirme isso com o setor responsável?",
  },
  {
    id: "unidades",
    gatilhos: ["quantas unidades", "quantas vem", "quantidade no pote", "tamanho do pote", "dura quanto"],
    resposta: () => "Claro! Cada pote vem com *30 unidades*. 😊\n\n" +
      "Posso ajudar com mais alguma dúvida?",
  },

  /* --- identificação do produto: só o que está na embalagem --- */
  {
    id: "composicao",
    gatilhos: ["composicao", "componente", "componentes", "ingrediente", "formula",
      "contem", "substancia", "tabela nutricional", "ativos", "o que tem dentro",
      "do que e feito", "principio ativo", "rotulo"],
    resposta: () =>
      "Ótima pergunta — e é justamente uma que eu prefiro não responder de cabeça. 🙏\n\n" +
      "Composição é informação que eu só passo com a documentação oficial em mãos. " +
      "Circula muita lista de ingrediente na internet que não confere, e quando o " +
      "assunto é o que você vai consumir, chute não serve.\n\n" +
      "Vou te encaminhar para o setor que tem a ficha técnica completa. Pode ser?",
  },
  {
    id: "o_que_e",
    gatilhos: ["que e", "produto", "goma", "gummy", "mounja", "sobre", "informacao", "conhecer"],
    resposta: () =>
      "Claro! 😊 O Mounja Gummy é uma *goma mastigável*:\n\n" +
      "• Pote com 30 unidades\n" +
      "• Sabor tangerina com limão\n" +
      "• Embalagem informa \"sem glúten\"\n" +
      "• Não precisa de água nem preparo\n\n" +
      "Qual parte você gostaria de entender melhor?",
  },
  {
    id: "para_que_serve",
    gatilhos: ["serve", "finalidade", "funciona", "beneficio", "utilidade", "objetivo"],
    resposta: () =>
      "Entendo a dúvida! O produto foi divulgado com relação ao controle de peso.\n\n" +
      "Agora, sendo transparente com você: eu não posso afirmar eficácia nem " +
      "recomendar o uso por conta própria — isso é conversa para quem tem a " +
      "documentação e a formação certa.\n\n" +
      "Quer que eu te encaminhe para o setor responsável?",
  },

  /* --- promessas de resultado: sempre negadas --- */
  {
    id: "emagrece",
    gatilhos: ["emagrece", "emagrecer", "emagrecimento", "perder peso", "secar", "queima gordura",
      "gordura", "barriga", "bom mesmo", "funciona mesmo", "vale a pena", "realmente funciona",
      "fome", "apetite", "saciedade", "ansiedade", "metabolismo", "inchaco"],
    resposta: () =>
      "Entendo perfeitamente — é o que todo mundo quer saber antes de decidir. 😊\n\n" +
      "Sendo sincera com você: resultado varia bastante de pessoa para pessoa, " +
      "porque depende de metabolismo, alimentação e rotina de cada um. Por isso eu " +
      "não vou te prometer número nem prazo que eu não posso garantir.\n\n" +
      "Quer conversar com alguém do time sobre o seu caso?",
  },
  {
    id: "tempo_resultado",
    gatilhos: ["quanto tempo", "faz efeito", "demora", "resultado", "primeiros resultados", "tres dias", "semana"],
    resposta: () =>
      "Boa pergunta! Prazo é exatamente a parte que eu não consigo garantir. 🙏\n\n" +
      "Cada organismo responde no seu tempo, e qualquer número que eu desse aqui " +
      "seria chute — prefiro ser honesta com você.\n\n" +
      "Posso te passar para alguém do time conversar melhor?",
  },
  {
    id: "quantos_quilos",
    gatilhos: ["quantos quilos", "quantos kg", "perco", "vou perder", "quilo"],
    resposta: () =>
      "Entendo a expectativa! Mas essa conta ninguém consegue fazer com honestidade. 🙏\n\n" +
      "Depende de metabolismo, rotina, alimentação — é muito individual. Não vou te " +
      "dar um número que eu não posso sustentar.\n\n" +
      "Quer falar com alguém do time sobre o seu caso?",
  },

  /* --- comparações e natureza do produto --- */
  {
    id: "mounjaro",
    gatilhos: ["mounjaro", "ozempic", "wegovy", "tirzepatida", "semaglutida", "caneta", "igual ao"],
    resposta: () =>
      "Ótima pergunta, e é importante deixar isso bem claro. 🙏\n\n" +
      "*Não são a mesma coisa.* O Mounjaro, o Ozempic e o Wegovy são medicamentos, " +
      "com prescrição e acompanhamento médico. Eu não apresento o Gummy como " +
      "equivalente, substituto ou semelhante a nenhum deles.\n\n" +
      "Posso ajudar com mais alguma dúvida?",
  },
  {
    id: "medicamento",
    gatilhos: ["medicamento", "remedio", "farmaco", "tarja"],
    resposta: () => "Boa pergunta! *Não*, eu não apresento o produto como medicamento. 🙏\n\n" +
      "São categorias diferentes, com regras diferentes.\n\n" +
      "Tem mais alguma coisa que eu possa esclarecer?",
  },

  /* --- situação sanitária --- */
  /* Assunto regulatório sai do robô e vai para uma pessoa. O robô não afirma
     que tem registro nem que não tem — quem trata disso é o time. */
  {
    id: "anvisa",
    gatilhos: ["anvisa", "aprovado", "registro", "registrado", "liberado", "autorizado",
      "notificacao", "orgao", "fiscalizacao", "proibido", "proibicao", "apreensao",
      "resolucao", "procede", "denuncia", "reportagem", "noticia"],
    resposta: () => ENCAMINHA,
    escalar: true,
    /* Assunto regulatório sai do robô e não volta: ele encaminha, se desliga
       nessa conversa e quem responde é uma pessoa. Nem o motor interno nem a
       IA opinam sobre situação sanitária. */
    critico: true,
  },
  {
    id: "seguro",
    gatilhos: ["seguro", "faz mal", "confiavel", "risco", "perigoso", "efeito colateral", "contraindicacao"],
    resposta: () =>
      "Entendo totalmente a preocupação. 🙏\n\n" +
      "Essa é uma pergunta que precisa ser avaliada por um profissional de saúde, " +
      "e eu não quero te passar uma orientação incorreta sobre algo assim.\n\n" +
      "Vou te encaminhar para o setor responsável agora.",
    escalar: true,
  },
  {
    id: "modo_uso",
    gatilhos: ["como tomar", "como usar", "modo de uso", "posologia", "dose", "quantas gomas por dia", "quantas unidades", "horario", "tomo", "mastigar"],
    resposta: () =>
      "Entendo a dúvida! Mas orientação de uso é algo que precisa vir de um " +
      "profissional ou do setor responsável — não quero te passar nada impreciso. 🙏\n\n" +
      "Vou te encaminhar agora. Pode ser?",
    escalar: true,
  },

  /* --- comercial: o robô não fecha venda, passa para uma pessoa --- */
  {
    id: "preco",
    gatilhos: ["preco", "quanto custa", "valor", "custa", "quanto e", "comprar", "compra", "pedido novo"],
    resposta: () =>
      "Claro! 😊 Sobre valores e condições, vou te encaminhar para o time comercial, " +
      "que passa tudo certinho para você.\n\n" +
      "Só um instante!",
    escalar: true,
  },
  {
    id: "frete",
    gatilhos: ["frete", "entrega", "envio", "chega", "correio", "sedex", "prazo de entrega", "cep"],
    resposta: () =>
      "Boa! 😊 O prazo e o valor de envio dependem bastante da sua região.\n\n" +
      "Vou te encaminhar para o time, que consegue calcular direitinho para a sua " +
      "cidade. Só um instante!",
    escalar: true,
  },
  {
    id: "pagamento",
    gatilhos: ["pagar", "pagamento", "pix", "cartao", "boleto", "parcelar", "parcela", "link"],
    resposta: () =>
      "Claro! Sobre formas de pagamento, vou te encaminhar para o time comercial. 😊\n\n" +
      "Só um instante!",
    escalar: true,
  },
  {
    id: "kits_promocao",
    gatilhos: ["kit", "desconto", "promocao", "oferta", "cupom", "frete gratis", "brinde", "combo"],
    resposta: () =>
      "Ótima pergunta! 😊 Condições e kits são com o time comercial, que tem sempre a " +
      "informação mais atual.\n\n" +
      "Vou te encaminhar agora, pode ser?",
    escalar: true,
  },
  {
    id: "insiste_compra",
    gatilhos: ["mesmo assim quero", "quero comprar", "onde compro", "onde encontro", "tem em algum lugar", "outro site", "mercado livre", "shopee"],
    resposta: () =>
      "Entendo! 😊 Vou te encaminhar para o time, que consegue te orientar sobre isso " +
      "certinho.\n\n" +
      "Só um instante!",
    escalar: true,
  },
  {
    id: "viu_propaganda",
    gatilhos: ["vi um anuncio", "propaganda", "anuncio", "instagram", "tiktok", "facebook", "vi na internet", "vi vendendo"],
    resposta: () => ENCAMINHA,
    escalar: true,
  },

  /* --- tudo abaixo vai para atendimento humano (§23) --- */
  {
    id: "reacao_adversa",
    gatilhos: ["passei mal", "passar mal", "reacao", "efeito ruim", "vomito", "nausea", "tontura", "dor", "alergia", "intoxicacao", "internado"],
    resposta: () =>
      "Sinto muito que isso tenha acontecido. 🙏\n\n" +
      "Como você relatou um problema de saúde, eu não vou tentar diagnosticar nem " +
      "orientar tratamento. Recomendo procurar atendimento profissional e, se " +
      "houver qualquer sinal de urgência, buscar atendimento imediato.\n\n" +
      "Estou te encaminhando para o time agora mesmo.",
    escalar: true,
    critico: true,
  },
  {
    id: "reembolso",
    gatilhos: ["reembolso", "estorno", "devolver dinheiro", "cancelar", "cobranca", "cobrado",
      "estornar", "devolucao", "trocar", "troca", "arrependi", "quero outro"],
    resposta: () =>
      "Claro, vou te ajudar com isso! 😊\n\n" +
      "Vou te encaminhar para o setor que cuida de pedidos e pagamentos, que resolve " +
      "isso com você. Só um instante!",
    escalar: true,
  },
  {
    id: "rastreio",
    gatilhos: ["rastrear", "rastreio", "codigo de rastreio", "onde esta", "meu pedido",
      "nao chegou", "cade", "atrasado", "comprei", "fiz o pedido", "nao recebi",
      "nao rastreia", "chegou quebrado", "veio errado", "extravio"],
    resposta: () =>
      "Claro! Vou verificar isso para você. 😊\n\n" +
      "Estou te encaminhando para o setor que acompanha os pedidos. Só um instante!",
    escalar: true,
  },
  {
    id: "reclamacao",
    gatilhos: ["reclamacao", "reclamar", "pessimo", "horrivel", "processo", "processar",
      "procon", "golpe", "enganado", "absurdo", "advogado", "denuncia", "justica",
      "acionar", "direito do consumidor"],
    resposta: () => "Sinto muito por isso, e obrigada por me contar. 🙏\n\n" +
      "Vou te encaminhar agora para o time resolver isso com você.",
    escalar: true,
    critico: true,
  },
  {
    id: "documentacao",
    gatilhos: ["documentacao", "laudo", "certificado", "nota fiscal", "comprovante", "resolucao", "documento sanitario"],
    resposta: () =>
      "Claro! 😊 Vou te encaminhar para o setor que tem essa documentação.\n\n" +
      "Só um instante!",
    escalar: true,
  },

  { id: "saudacao", gatilhos: ["bom dia sozinho", "opa"],
    resposta: () => "Olá! Em que posso ajudar?" },

  /* --- dados da empresa e do rótulo: buracos achados em teste --- */
  {
    id: "contato",
    gatilhos: ["email", "telefone de contato", "falar com", "responsavel tecnico", "sac",
      "atendimento humano", "loja fisica", "endereco de vcs", "onde fica"],
    resposta: () =>
      "Claro! 😊 Vou te encaminhar para o setor que passa os dados de contato " +
      "certinho para você.\n\n" +
      "Só um instante, tudo bem?",
    escalar: true,
  },
  {
    id: "empresa",
    gatilhos: ["cnpj", "razao social", "empresa", "fabricante", "quem fabrica",
      "onde e fabricado", "fabricado onde", "importado"],
    resposta: () =>
      "Claro! O fabricante informado na embalagem é a *Bela Blue Beauty Ltda*. 😊\n\n" +
      "Qualquer outro dado cadastral eu prefiro que o setor responsável confirme " +
      "com você, para não te passar nada desatualizado.\n\n" +
      "Quer que eu encaminhe?",
    escalar: true,
  },
  {
    id: "validade",
    gatilhos: ["validade", "vence", "vencimento", "lote", "fabricacao", "lacrado", "lacre"],
    resposta: () =>
      "Claro! A *validade* e o *lote* vêm impressos na própria embalagem do pote. 😊\n\n" +
      "Se o seu chegou sem essa informação ou com o lacre violado, me avisa que eu " +
      "aciono o time na hora.\n\n" +
      "Está tudo certo com o seu?",
  },
  {
    id: "dieta_exercicio",
    gatilhos: ["dieta", "malhar", "academia", "exercicio", "treino", "reeducacao alimentar",
      "flacidez", "flacida", "efeito rebote", "rebote"],
    resposta: () =>
      "Entendo a dúvida! 🙏\n\n" +
      "Rotina de alimentação e exercício é orientação de profissional de saúde — " +
      "nutricionista ou educador físico. Não é algo que eu deva indicar por aqui.\n\n" +
      "Quer que eu te encaminhe para o time?",
    escalar: true,
  },

  /* --- conversa solta: responder aqui evita encaminhamento à toa --- */
  {
    id: "agradecimento",
    gatilhos: ["obrigado", "obrigada", "valeu", "agradecido", "brigado", "vlw"],
    resposta: () => "Imagina, foi um prazer! 😊\n\n" +
      "Se surgir qualquer outra dúvida, é só me chamar por aqui.",
  },
  {
    id: "despedida",
    gatilhos: ["tchau", "ate mais", "ate logo", "falou", "boa noite entao", "abraco"],
    resposta: () => "Até mais! 😊 Qualquer dúvida, estou por aqui.",
  },
  {
    id: "quem_e_voce",
    gatilhos: ["seu nome", "qual seu nome", "voce e robo", "e um robo", "atendente", "humano",
      "falando com quem", "pessoa real", "bot"],
    resposta: () =>
      "Eu sou a Renata, do atendimento da *Bela Blue Beauty*! 😊\n\n" +
      "Se preferir falar com outra pessoa do time, é só me dizer que eu chamo.\n\n" +
      "Como posso te ajudar?",
  },
  {
    id: "horario_atendimento",
    gatilhos: ["horario de atendimento", "que horas", "atendem", "funcionamento", "fim de semana", "domingo"],
    resposta: () =>
      "Por aqui eu respondo a qualquer hora! 😊\n\n" +
      "Se precisar falar com alguém do time, o retorno acontece em horário comercial.\n\n" +
      "Posso ajudar com mais alguma coisa?",
  },
];

/* ---------- casamento ----------
   Cada intenção vira um vocabulário. Uma palavra vale mais quanto menos
   intenções a usam ("custa" distingue, "dia" não), e a nota de uma intenção é
   a soma do peso das palavras da mensagem que ela reconhece. Foi assim que
   "quanto tempo demora" deixou de cair em preço: "tempo" e "demora" só
   existem em frete, enquanto "quanto" sozinho quase não pesa. */

const LIMIAR = 0.55;
const K = 1.6; // quanto de evidência é preciso para chegar perto de 1

type Vocabulario = { id: string; palavras: Set<string>; escalar: boolean; critico: boolean; texto: () => string; bonus: number };

/* Distância de edição com corte: para em 2 e devolve 99. Cliente digita no
   celular, com pressa — "emagrese", "gluten", "quanot" são o normal, e sem
   isso cada erro de uma letra vira encaminhamento. */
function distancia(a: string, b: string, limite = 1): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limite) return 99;

  /* Damerau: troca de letras vizinhas custa 1, não 2. "sabro" por "sabor" é o
     erro mais comum de quem digita rápido, e em Levenshtein puro ele fica
     fora do limite. */
  let doisAtras: number[] = [];
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let melhorDaLinha = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, doisAtras[j - 2] + 1);
      }
      atual[j] = v;
      melhorDaLinha = Math.min(melhorDaLinha, v);
    }
    // linha inteira já passou do limite: não tem como melhorar
    if (melhorDaLinha > limite) return 99;
    doisAtras = anterior;
    anterior = atual;
  }
  return anterior[b.length];
}

/** Casa por prefixo (conjugação) e por 1 letra de diferença (digitação). */
function casa(palavra: string, vocab: Set<string>): boolean {
  if (vocab.has(palavra)) return true;
  for (const v of vocab) {
    const menor = Math.min(palavra.length, v.length);
    if (menor > 4 && (palavra.startsWith(v) || v.startsWith(palavra))) return true;
    // só em palavra longa: em palavra curta uma letra muda o sentido
    // ("dose" e "dor", "kit" e "kg")
    if (menor >= 5 && distancia(palavra, v) <= 1) return true;
  }
  return false;
}

function montarVocabularios(exemplos: { pergunta: string; resposta: string }[]): Vocabulario[] {
  const lista: Vocabulario[] = INTERNAS.map((i) => ({
    id: i.id,
    palavras: new Set(i.gatilhos.flatMap((g) => [...conjunto(g)])),
    escalar: Boolean(i.escalar),
    critico: Boolean(i.critico),
    texto: i.resposta,
    bonus: 0,
  }));
  for (const ex of exemplos) {
    const pergunta = ex.pergunta?.trim();
    const resposta = ex.resposta?.trim();
    if (!pergunta || !resposta) continue;
    // o que você escreveu no painel vale mais que a intenção embutida
    lista.push({ id: "treinamento", palavras: conjunto(pergunta), escalar: false, critico: false, texto: () => resposta, bonus: 0.12 });
  }
  return lista.filter((v) => v.palavras.size > 0);
}

export type Casamento = { texto: string; escalar: boolean; critico: boolean; intencao: string; confianca: number };
/**
 * Procura a melhor resposta local. Devolve `null` quando nenhuma intenção
 * reúne evidência suficiente — aí quem chama encaminha para um humano.
 */
export function responderLocal(
  mensagem: string,
  exemplos: { pergunta: string; resposta: string }[] = []
): Casamento | null {
  /* saudação curta resolve antes: sem isso, "oi" vira encaminhamento */
  if (ehSaudacaoPura(mensagem)) {
    const s = INTERNAS.find((i) => i.id === "saudacao");
    if (s) return { texto: s.resposta(), escalar: false, critico: false, intencao: "saudacao", confianca: 1 };
  }

  /* "oi, qual o sabor?" pontua como "qual o sabor": a saudação na frente não
     deve competir com o assunto de verdade. */
  const assunto = semSaudacao(mensagem) || mensagem;
  const palavras = [...conjunto(assunto)];
  if (palavras.length === 0) return null;

  const vocabs = montarVocabularios(exemplos);

  /* df = em quantos vocabulários a palavra aparece. Palavra que está em todo
     lugar não distingue nada e por isso pesa pouco. */
  const peso = new Map<string, number>();
  for (const p of palavras) {
    const df = vocabs.filter((v) => casa(p, v.palavras)).length;
    peso.set(p, df === 0 ? 0 : Math.log(1 + vocabs.length / df));
  }

  let melhor: Casamento | null = null;
  for (const v of vocabs) {
    let evidencia = 0;
    for (const p of palavras) if (casa(p, v.palavras)) evidencia += peso.get(p) ?? 0;
    if (evidencia === 0) continue;

    /* O bônus do treinamento cresce com a cobertura: casar 1 de 5 palavras da
       pergunta cadastrada não é o mesmo que casar 4 de 5. */
    const casadas = palavras.filter((p) => casa(p, v.palavras)).length;
    const cobertura = Math.min(1, casadas / v.palavras.size);
    const confianca = evidencia / (evidencia + K) + v.bonus * cobertura;
    if (confianca < LIMIAR) continue;

    // empate vai para quem passa a conversa adiante — errar calado é pior
    const ganha = !melhor || confianca > melhor.confianca + 1e-9 ||
      (Math.abs(confianca - melhor.confianca) < 1e-9 && v.escalar && !melhor.escalar);
    if (ganha) melhor = { texto: v.texto(), escalar: v.escalar, critico: v.critico, intencao: v.id, confianca };
  }

  return melhor;
}

/** Lista as intenções embutidas, para mostrar no painel. */
export const intencoesEmbutidas = () =>
  INTERNAS.map((i) => ({ id: i.id, gatilhos: i.gatilhos.slice(0, 5), escalar: Boolean(i.escalar) }));
