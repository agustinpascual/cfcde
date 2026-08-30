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
  "Sobre isso eu vou te encaminhar para outro setor, que consegue te informar " +
  "corretamente. Só um instante.";

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
      "Essa é uma questão que precisa ser avaliada por um profissional de saúde. Não quero " +
      "te passar uma orientação incorreta. Vou te encaminhar para o time.",
    escalar: true,
    critico: true,
  },
  {
    id: "sabor",
    gatilhos: ["sabor", "gosto", "sabores", "tangerina", "limao", "doce", "azedo"],
    resposta: () => "O sabor é tangerina com limão.",
  },
  {
    id: "restricoes",
    gatilhos: ["gluten", "lactose", "vegano", "vegetariano", "acucar", "zero acucar", "celiaco", "restricao"],
    resposta: () =>
      "A embalagem informa \"sem glúten\". Sobre qualquer outra restrição alimentar eu " +
      "prefiro não afirmar sem a documentação — posso te encaminhar para o time confirmar.",
  },
  {
    id: "unidades",
    gatilhos: ["quantas unidades", "quantas vem", "quantidade no pote", "tamanho do pote", "dura quanto"],
    resposta: () => "Cada pote vem com 30 unidades.",
  },

  /* --- identificação do produto: só o que está na embalagem --- */
  {
    id: "composicao",
    gatilhos: ["composicao", "ingrediente", "formula", "contem", "substancia", "tabela nutricional"],
    resposta: () =>
      "Composição é informação que eu só passo com o documento na mão — não quero te " +
      "dizer algo errado sobre o que você vai consumir. Vou te encaminhar para o time, " +
      "que tem a ficha completa.",
  },
  {
    id: "o_que_e",
    gatilhos: ["que e", "produto", "goma", "gummy", "mounja", "sobre", "informacao", "conhecer"],
    resposta: () =>
      "O Mounja Gummy é uma goma mastigável, em pote com 30 unidades, sabor tangerina " +
      "e limão. Se tiver outra dúvida sobre o produto, é só me dizer.",
  },
  {
    id: "para_que_serve",
    gatilhos: ["serve", "finalidade", "funciona", "beneficio", "utilidade", "objetivo"],
    resposta: () =>
      "Ele é divulgado com relação ao controle de peso. Eficácia é uma coisa que eu não " +
      "posso afirmar por conta própria — quem fala sobre isso é o time. Quer que eu " +
      "encaminhe?",
  },

  /* --- promessas de resultado: sempre negadas --- */
  {
    id: "emagrece",
    gatilhos: ["emagrece", "emagrecer", "emagrecimento", "perder peso", "secar", "queima gordura",
      "gordura", "barriga", "bom mesmo", "funciona mesmo", "vale a pena", "realmente funciona",
      "fome", "apetite", "saciedade", "ansiedade", "metabolismo", "inchaco"],
    resposta: () =>
      "Entendo a dúvida, é o que todo mundo quer saber antes de decidir. Sendo sincero " +
      "com você: resultado varia muito de pessoa para pessoa, e eu não tenho como te " +
      "prometer número nem prazo. Quer que eu chame alguém do time para conversar sobre " +
      "o seu caso?",
  },
  {
    id: "tempo_resultado",
    gatilhos: ["quanto tempo", "faz efeito", "demora", "resultado", "primeiros resultados", "tres dias", "semana"],
    resposta: () =>
      "Prazo é a parte que eu não consigo te garantir — cada organismo responde no seu " +
      "tempo, e qualquer número que eu desse seria chute. Prefiro não inventar. Posso te " +
      "passar para alguém do time se quiser conversar melhor.",
  },
  {
    id: "quantos_quilos",
    gatilhos: ["quantos quilos", "quantos kg", "perco", "vou perder", "quilo"],
    resposta: () =>
      "Essa conta ninguém consegue fazer com honestidade, porque depende de metabolismo, " +
      "rotina e alimentação de cada um. Não vou te dar um número que eu não posso " +
      "sustentar. Se quiser, chamo alguém do time para te atender.",
  },

  /* --- comparações e natureza do produto --- */
  {
    id: "mounjaro",
    gatilhos: ["mounjaro", "ozempic", "wegovy", "tirzepatida", "semaglutida", "caneta", "igual ao"],
    resposta: () =>
      "Não. Não devo apresentar o produto como equivalente, substituto ou semelhante a " +
      "medicamentos como Mounjaro, Ozempic ou Wegovy.",
  },
  {
    id: "medicamento",
    gatilhos: ["medicamento", "remedio", "farmaco", "tarja"],
    resposta: () => "Não devo apresentar o produto como medicamento.",
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
      "Essa é uma questão que precisa ser avaliada por um profissional de saúde, e não " +
      "quero te passar uma orientação incorreta. Vou te encaminhar para o time.",
    escalar: true,
  },
  {
    id: "modo_uso",
    gatilhos: ["como tomar", "como usar", "modo de uso", "posologia", "dose", "quantas gomas por dia", "quantas unidades", "horario", "tomo", "mastigar"],
    resposta: () =>
      "A orientação de uso precisa vir de um profissional ou do time — não quero te " +
      "passar algo incorreto. Vou te encaminhar.",
    escalar: true,
  },

  /* --- comercial: o robô não fecha venda, passa para uma pessoa --- */
  {
    id: "preco",
    gatilhos: ["preco", "quanto custa", "valor", "custa", "quanto e", "comprar", "compra", "pedido novo"],
    resposta: () =>
      "Sobre valores e condições eu vou te encaminhar para o time, que te atende " +
      "certinho. Só um instante.",
    escalar: true,
  },
  {
    id: "frete",
    gatilhos: ["frete", "entrega", "envio", "chega", "correio", "sedex", "prazo de entrega", "cep"],
    resposta: () =>
      "Sobre envio e prazo eu vou te encaminhar para o time. Só um instante.",
    escalar: true,
  },
  {
    id: "pagamento",
    gatilhos: ["pagar", "pagamento", "pix", "cartao", "boleto", "parcelar", "parcela", "link"],
    resposta: () =>
      "Sobre formas de pagamento eu vou te encaminhar para o time. Só um instante.",
    escalar: true,
  },
  {
    id: "kits_promocao",
    gatilhos: ["kit", "desconto", "promocao", "oferta", "cupom", "frete gratis", "brinde", "combo"],
    resposta: () =>
      "Sobre kits e condições eu vou te encaminhar para o time, que te atende certinho.",
    escalar: true,
  },
  {
    id: "insiste_compra",
    gatilhos: ["mesmo assim quero", "quero comprar", "onde compro", "onde encontro", "tem em algum lugar", "outro site", "mercado livre", "shopee"],
    resposta: () =>
      "Vou te encaminhar para o time, que consegue te orientar sobre isso. Só um instante.",
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
      "Sinto muito que isso tenha acontecido. Como você relatou um problema de saúde, não " +
      "vou tentar diagnosticar ou orientar seu tratamento. Recomendo procurar atendimento " +
      "profissional e, se houver sinais de emergência, buscar atendimento de urgência. " +
      "Vou te encaminhar para o time agora.",
    escalar: true,
    critico: true,
  },
  {
    id: "reembolso",
    gatilhos: ["reembolso", "estorno", "devolver dinheiro", "cancelar", "cobranca", "cobrado",
      "estornar", "devolucao", "trocar", "troca", "arrependi", "quero outro"],
    resposta: () =>
      "Vou te encaminhar para outro setor, que consegue te informar direitinho sobre isso. " +
      "Só um instante.",
    escalar: true,
  },
  {
    id: "rastreio",
    gatilhos: ["rastrear", "rastreio", "codigo de rastreio", "onde esta", "meu pedido",
      "nao chegou", "cade", "atrasado", "comprei", "fiz o pedido", "nao recebi",
      "nao rastreia", "chegou quebrado", "veio errado", "extravio"],
    resposta: () =>
      "Vou te encaminhar para outro setor, que consegue verificar seu pedido. Só um instante.",
    escalar: true,
  },
  {
    id: "reclamacao",
    gatilhos: ["reclamacao", "reclamar", "pessimo", "horrivel", "processo", "processar",
      "procon", "golpe", "enganado", "absurdo", "advogado", "denuncia", "justica",
      "acionar", "direito do consumidor"],
    resposta: () => "Sinto muito por isso. Vou te encaminhar para o time agora.",
    escalar: true,
    critico: true,
  },
  {
    id: "documentacao",
    gatilhos: ["documentacao", "laudo", "certificado", "nota fiscal", "comprovante", "resolucao", "documento sanitario"],
    resposta: () =>
      "Vou te encaminhar para outro setor, que consegue te informar direitinho sobre isso. " +
      "Só um instante.",
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
      "Vou te encaminhar para o time, que passa os dados de contato certinho pra você.",
    escalar: true,
  },
  {
    id: "empresa",
    gatilhos: ["cnpj", "razao social", "empresa", "fabricante", "quem fabrica",
      "onde e fabricado", "fabricado onde", "importado"],
    resposta: () =>
      "O fabricante informado na embalagem é a Bela Blue Beauty Ltda. Qualquer outro dado " +
      "cadastral eu prefiro que o time confirme com você.",
    escalar: true,
  },
  {
    id: "validade",
    gatilhos: ["validade", "vence", "vencimento", "lote", "fabricacao", "lacrado", "lacre"],
    resposta: () =>
      "A validade e o lote vêm impressos na própria embalagem. Se o seu pote estiver sem " +
      "essa informação ou com o lacre violado, me avisa que eu chamo o time.",
  },
  {
    id: "dieta_exercicio",
    gatilhos: ["dieta", "malhar", "academia", "exercicio", "treino", "reeducacao alimentar",
      "flacidez", "flacida", "efeito rebote", "rebote"],
    resposta: () =>
      "Não posso afirmar resultado nem indicar rotina de dieta ou exercício — isso é " +
      "orientação de profissional de saúde. Vou te encaminhar para o time.",
    escalar: true,
  },

  /* --- conversa solta: responder aqui evita encaminhamento à toa --- */
  {
    id: "agradecimento",
    gatilhos: ["obrigado", "obrigada", "valeu", "agradecido", "brigado", "vlw"],
    resposta: () => "Imagina! Se precisar de mais alguma coisa é só chamar.",
  },
  {
    id: "despedida",
    gatilhos: ["tchau", "ate mais", "ate logo", "falou", "boa noite entao", "abraco"],
    resposta: () => "Até mais! Qualquer dúvida, é só mandar mensagem.",
  },
  {
    id: "quem_e_voce",
    gatilhos: ["seu nome", "qual seu nome", "voce e robo", "e um robo", "atendente", "humano",
      "falando com quem", "pessoa real", "bot"],
    resposta: () =>
      "Sou o atendimento virtual da Bela Blue Beauty. Se preferir falar com uma pessoa do " +
      "time, é só me dizer que eu chamo.",
  },
  {
    id: "horario_atendimento",
    gatilhos: ["horario de atendimento", "que horas", "atendem", "funcionamento", "fim de semana", "domingo"],
    resposta: () =>
      "Eu respondo por aqui a qualquer hora. Se precisar de alguém do time, o retorno é " +
      "em horário comercial.",
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

/** Casa por prefixo para tolerar conjugação: "entrega" ↔ "entregar". */
function casa(palavra: string, vocab: Set<string>): boolean {
  if (vocab.has(palavra)) return true;
  for (const v of vocab) {
    const menor = Math.min(palavra.length, v.length);
    if (menor > 4 && (palavra.startsWith(v) || v.startsWith(palavra))) return true;
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
