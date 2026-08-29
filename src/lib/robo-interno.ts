import "server-only";
import { kits, produto } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/data";
import { opcoesFrete } from "@/components/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/data";

/* Motor de resposta local, sem IA.
   Casa a mensagem do cliente com intenções conhecidas por sobreposição de
   palavras. Quando a confiança é baixa, escala para um humano em vez de
   responder errado — para suplemento isso importa mais que cobrir tudo. */

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

const moeda = (v: string) => v.replace("R$ ", "R$");

const INTERNAS: Intencao[] = [
  {
    id: "preco",
    gatilhos: ["preco", "quanto custa", "valor", "custa", "tabela", "desconto", "promocao", "barato", "caro", "pote", "kit", "unidade"],
    resposta: () =>
      `Os valores são:\n\n` +
      kits.map((k) => `• ${k.nome} — ${moeda(k.total)}${k.economia ? ` (${k.economia.toLowerCase()})` : ""}`).join("\n") +
      `\n\nNo PIX tem 5% de desconto em qualquer um deles.`,
  },
  {
    id: "frete",
    gatilhos: ["frete", "entrega", "envio", "chega", "correio", "sedex", "quanto tempo", "prazo", "demora"],
    resposta: () =>
      opcoesFrete
        .map((o) => `• ${o.nome}: ${o.min} a ${o.max} dias úteis — ${o.preco === 0 ? "grátis" : `R$${o.preco.toFixed(2).replace(".", ",")}`}`)
        .join("\n") + `\n\nO prazo começa a contar depois da confirmação do pagamento.`,
  },
  {
    id: "pagamento",
    gatilhos: ["pagar", "pagamento", "pix", "cartao", "boleto", "parcelar", "parcela", "forma de pagamento"],
    resposta: () => `O pagamento é por PIX, com 5% de desconto já aplicado no total. O código aparece na hora e a aprovação é imediata.`,
  },
  {
    id: "como_tomar",
    gatilhos: ["como tomar", "como usar", "tomo", "toma", "quantas", "posologia", "dose", "por dia", "modo de uso", "quantidade", "horario"],
    resposta: () => `A porção diária vem indicada no rótulo do pote — recomendo seguir exatamente o que está lá e não passar da quantidade indicada.`,
  },
  {
    id: "o_que_e",
    gatilhos: ["produto", "goma", "capsula", "serve", "funciona", "composicao", "ingrediente", "formula", "sabor", "natural"],
    resposta: () => `O ${produto.nome} é um suplemento alimentar em gomas mastigáveis. Não precisa de água nem preparo — dá para tomar em qualquer horário do dia.`,
  },
  {
    id: "rastreio",
    gatilhos: ["rastrear", "rastreio", "codigo de rastreio", "onde esta", "meu pedido", "pedido nao chegou", "cade"],
    resposta: () => `Vou verificar seu pedido aqui, um instante.`,
    escalar: true,
  },
  {
    id: "saude",
    gatilhos: [
      "gravida", "gravidez", "amamentando", "amamenta", "diabete", "diabetico", "pressao",
      "remedio", "medicamento", "alergia", "alergico", "crianca", "menor", "cirurgia",
      "anticoncepcional", "tireoide", "efeito colateral", "contraindicacao", "faz mal", "posso tomar",
    ],
    resposta: () => `Essa é uma pergunta de saúde, e eu não posso opinar. Vou chamar alguém do time — e vale conversar com seu médico ou nutricionista antes.`,
    escalar: true,
  },
  {
    id: "troca",
    gatilhos: ["trocar", "troca", "devolver", "devolucao", "arrependi", "cancelar", "reembolso", "estorno"],
    resposta: () => `Você tem 7 dias para troca ou devolução. Vou chamar alguém do time para resolver isso com você.`,
    escalar: true,
  },
  {
    id: "reclamacao",
    gatilhos: ["reclamacao", "reclamar", "pessimo", "horrivel", "processo", "procon", "golpe", "enganado", "absurdo"],
    resposta: () => `Sinto muito por isso. Vou chamar alguém do time agora para te atender.`,
    escalar: true,
  },
  {
    id: "saudacao",
    gatilhos: ["bom dia", "boa tarde", "boa noite", "tudo bem", "oi", "ola", "opa"],
    resposta: () => `Oi! Como posso ajudar?`,
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
