import "server-only";

/* Motor de resposta local, sem IA.
   Casa a mensagem do cliente com intenções conhecidas por sobreposição de
   palavras. Quando a confiança é baixa, escala para um humano em vez de
   responder errado.

   As respostas seguem a política de atendimento do Mounja Gummy, que existe
   por causa da Resolução-RE nº 3.242/2026 da Anvisa: o produto não tem
   registro, notificação nem cadastro na Agência, e estão proibidas
   fabricação, venda, distribuição, importação e divulgação.

   Por isso este motor NÃO informa preço, frete, forma de pagamento nem modo
   de uso, e nunca afirma eficácia. Nada aqui deve ser religado a `kits`,
   `opcoesFrete` ou a qualquer dado comercial da loja. */

/* ---------- normalização ---------- */
const SEM_ACENTO = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const VAZIAS = new Set([
  "a","o","as","os","um","uma","de","do","da","dos","das","em","no","na","nos","nas",
  "por","para","pra","pro","com","sem","e","ou","que","se","ao","aos","à","às","é",
  "eu","voce","vc","tu","meu","minha","seu","sua","me","te","lhe","isso","isto","esse",
  "essa","este","esta","ai","la","aqui","ja","mais","muito","bem","so","tem","ter",
  "vai","vou","quero","queria","gostaria","pode","poderia","ser","sao","the","oi","ola",
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

/* ---------- intenções embutidas ---------- */
export type Intencao = {
  id: string;
  gatilhos: string[];      // frases/palavras que apontam para esta intenção
  resposta: () => string;
  escalar?: boolean;
};

const ANVISA =
  "existe uma determinação da Anvisa relacionada ao produto, incluindo proibição de " +
  "fabricação, venda, distribuição, importação e divulgação";

const SEM_ORIENTAR_COMPRA =
  "Não posso orientar uma compra ou envio do produto porque existe uma determinação " +
  "sanitária vigente.";

const INTERNAS: Intencao[] = [
  /* --- identificação do produto --- */
  {
    id: "o_que_e",
    gatilhos: ["que e", "produto", "goma", "gummy", "mounja", "sobre", "informacao", "conhecer"],
    resposta: () =>
      "O Mounja Gummy é apresentado como uma goma mastigável em pote com 30 unidades, " +
      "com sabor informado de tangerina e limão. Porém, " + ANVISA + ".",
  },
  {
    id: "para_que_serve",
    gatilhos: ["serve", "finalidade", "funciona", "beneficio", "utilidade", "objetivo"],
    resposta: () =>
      "O produto foi comercializado com divulgação relacionada ao controle de peso. " +
      "Entretanto, não posso afirmar que ele seja eficaz para emagrecimento nem " +
      "recomendar seu uso. A Anvisa determinou a proibição do produto.",
  },

  /* --- promessas de resultado: sempre negadas --- */
  {
    id: "emagrece",
    gatilhos: ["emagrece", "emagrecer", "emagrecimento", "perder peso", "secar", "queima gordura", "gordura", "barriga"],
    resposta: () =>
      "Não posso afirmar que o produto provoque emagrecimento ou garantir qualquer " +
      "resultado. Além disso, existe uma determinação da Anvisa proibindo a venda e a " +
      "divulgação do produto.",
  },
  {
    id: "tempo_resultado",
    gatilhos: ["quanto tempo", "faz efeito", "demora", "resultado", "primeiros resultados", "tres dias", "semana"],
    resposta: () =>
      "Não existe um prazo de resultado que eu possa garantir. Não é correto afirmar que " +
      "o produto produz resultados em 3 dias ou em qualquer outro período específico.",
  },
  {
    id: "quantos_quilos",
    gatilhos: ["quantos quilos", "quantos kg", "perco", "vou perder", "quilo"],
    resposta: () =>
      "Não é possível determinar ou garantir quantos quilos uma pessoa perderia. Não devo " +
      "fornecer uma estimativa individual de emagrecimento.",
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
  {
    id: "anvisa",
    gatilhos: ["anvisa", "aprovado", "registro", "registrado", "liberado", "autorizado", "notificacao"],
    resposta: () =>
      "Não. Segundo informação oficial publicada pela Anvisa em 17 de agosto de 2026, o " +
      "Mounja Gummy não possui registro, notificação ou cadastro na Agência.",
  },
  {
    id: "seguro",
    gatilhos: ["seguro", "faz mal", "confiavel", "risco", "perigoso", "efeito colateral", "contraindicacao"],
    resposta: () =>
      "Não posso afirmar que o produto seja seguro. A Anvisa informou que o produto não " +
      "possui registro, notificação ou cadastro na Agência e determinou sua apreensão e " +
      "proibição.",
  },
  {
    id: "composicao",
    gatilhos: ["composicao", "ingrediente", "formula", "contem", "substancia", "tabela nutricional"],
    resposta: () =>
      "Para evitar te passar uma informação incorreta, não vou confirmar uma composição " +
      "que não esteja respaldada por documentação oficial.",
  },
  {
    id: "modo_uso",
    gatilhos: ["como tomar", "como usar", "modo de uso", "posologia", "dose", "quantas gomas por dia", "quantas unidades", "horario", "tomo", "mastigar"],
    resposta: () =>
      "Não posso orientar sobre como utilizar o produto diante da determinação sanitária " +
      "vigente.",
  },

  /* --- comercial: tudo recusado enquanto a proibição valer --- */
  {
    id: "preco",
    gatilhos: ["preco", "quanto custa", "valor", "custa", "quanto e", "comprar", "compra", "pedido novo"],
    resposta: () =>
      "Não posso orientar uma compra do produto porque existe uma determinação da Anvisa " +
      "proibindo sua venda e divulgação.",
  },
  {
    id: "frete",
    gatilhos: ["frete", "entrega", "envio", "chega", "correio", "sedex", "prazo de entrega", "cep"],
    resposta: () => SEM_ORIENTAR_COMPRA,
  },
  {
    id: "pagamento",
    gatilhos: ["pagar", "pagamento", "pix", "cartao", "boleto", "parcelar", "parcela", "link"],
    resposta: () =>
      "Não posso orientar pagamento nem enviar link de compra, porque existe uma " +
      "determinação da Anvisa proibindo a venda e a divulgação do produto.",
  },
  {
    id: "kits_promocao",
    gatilhos: ["kit", "desconto", "promocao", "oferta", "cupom", "frete gratis", "brinde", "combo"],
    resposta: () =>
      "Não posso oferecer kits, descontos ou promoções do produto. Existe uma determinação " +
      "da Anvisa proibindo sua venda e divulgação.",
  },
  {
    id: "insiste_compra",
    gatilhos: ["mesmo assim quero", "quero comprar", "onde compro", "onde encontro", "tem em algum lugar", "outro site", "mercado livre", "shopee"],
    resposta: () =>
      "Entendo, mas não posso orientar uma compra ou indicar onde adquirir o produto " +
      "enquanto existir a determinação sanitária vigente.",
  },
  {
    id: "viu_propaganda",
    gatilhos: ["vi um anuncio", "propaganda", "anuncio", "instagram", "tiktok", "facebook", "vi na internet", "vi vendendo"],
    resposta: () =>
      "É possível encontrar informações comerciais sobre o produto na internet, mas a " +
      "existência de uma propaganda não significa que o produto esteja autorizado. A " +
      "informação oficial da Anvisa deve prevalecer.",
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
  },
  {
    id: "saude",
    gatilhos: ["gravida", "gravidez", "amamentando", "amamenta", "diabete", "diabetico", "pressao",
      "interacao", "anticoncepcional", "tireoide", "crianca", "menor", "cirurgia", "posso tomar", "doenca"],
    resposta: () =>
      "Essa é uma questão que precisa ser avaliada por um profissional de saúde. Não quero " +
      "te passar uma orientação incorreta. Vou te encaminhar para o time.",
    escalar: true,
  },
  {
    id: "reembolso",
    gatilhos: ["reembolso", "estorno", "devolver dinheiro", "cancelar", "cobranca", "cobrado", "estornar", "devolucao", "trocar", "arrependi"],
    resposta: () =>
      "Vou te encaminhar para outro setor, que consegue te informar direitinho sobre isso. " +
      "Só um instante.",
    escalar: true,
  },
  {
    id: "rastreio",
    gatilhos: ["rastrear", "rastreio", "codigo de rastreio", "onde esta", "meu pedido", "nao chegou", "cade", "atrasado"],
    resposta: () =>
      "Vou te encaminhar para outro setor, que consegue verificar seu pedido. Só um instante.",
    escalar: true,
  },
  {
    id: "reclamacao",
    gatilhos: ["reclamacao", "reclamar", "pessimo", "horrivel", "processo", "procon", "golpe", "enganado", "absurdo", "advogado", "denuncia", "justica"],
    resposta: () => "Sinto muito por isso. Vou te encaminhar para o time agora.",
    escalar: true,
  },
  {
    id: "documentacao",
    gatilhos: ["documentacao", "laudo", "certificado", "nota fiscal", "comprovante", "resolucao", "documento sanitario"],
    resposta: () =>
      "Vou te encaminhar para outro setor, que consegue te informar direitinho sobre isso. " +
      "Só um instante.",
    escalar: true,
  },

  { id: "saudacao", gatilhos: ["bom dia", "boa tarde", "boa noite", "tudo bem", "opa"],
    resposta: () => "Olá! Em que posso ajudar?" },
];

/* ---------- casamento ----------
   Cada intenção vira um vocabulário. Uma palavra vale mais quanto menos
   intenções a usam ("custa" distingue, "dia" não), e a nota de uma intenção é
   a soma do peso das palavras da mensagem que ela reconhece. Foi assim que
   "quanto tempo demora" deixou de cair em preço: "tempo" e "demora" só
   existem em frete, enquanto "quanto" sozinho quase não pesa. */

const LIMIAR = 0.55;
const K = 1.6; // quanto de evidência é preciso para chegar perto de 1

type Vocabulario = { id: string; palavras: Set<string>; escalar: boolean; texto: () => string; bonus: number };

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
    texto: i.resposta,
    bonus: 0,
  }));
  for (const ex of exemplos) {
    const pergunta = ex.pergunta?.trim();
    const resposta = ex.resposta?.trim();
    if (!pergunta || !resposta) continue;
    // o que você escreveu no painel vale mais que a intenção embutida
    lista.push({ id: "treinamento", palavras: conjunto(pergunta), escalar: false, texto: () => resposta, bonus: 0.12 });
  }
  return lista.filter((v) => v.palavras.size > 0);
}

export type Casamento = { texto: string; escalar: boolean; intencao: string; confianca: number };
/**
 * Procura a melhor resposta local. Devolve `null` quando nenhuma intenção
 * reúne evidência suficiente — aí quem chama encaminha para um humano.
 */
export function responderLocal(
  mensagem: string,
  exemplos: { pergunta: string; resposta: string }[] = []
): Casamento | null {
  const palavras = [...conjunto(mensagem)];
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
    if (ganha) melhor = { texto: v.texto(), escalar: v.escalar, intencao: v.id, confianca };
  }

  return melhor;
}

/** Lista as intenções embutidas, para mostrar no painel. */
export const intencoesEmbutidas = () =>
  INTERNAS.map((i) => ({ id: i.id, gatilhos: i.gatilhos.slice(0, 5), escalar: Boolean(i.escalar) }));
