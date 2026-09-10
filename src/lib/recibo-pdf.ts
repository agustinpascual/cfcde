import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ler } from "./config-integracoes";
import type { DadosPedido } from "./emails-modelos";
import { sitePublicoEmail } from "./site-email";
import { formatarDataBrasilia, formatarHoraBrasilia } from "./data-brasilia";

/* Comprovante de venda em PDF, anexado ao e-mail de pagamento confirmado.

   Layout em quadros, no formato do modelo do Agustin: cabeçalho com logo e
   número da venda, natureza da operação, bloco do destinatário, tabela de
   produtos e dados adicionais.

   NÃO é NF-e: sem chave de acesso, sem código de barras, sem protocolo da
   SEFAZ. Esses elementos só existem num documento autorizado pelo fisco, e
   imitá-los exporia o vendedor.

   pdf-lib é JavaScript puro — roda no Worker da Cloudflare, ao contrário de
   qualquer solução com navegador headless. As fontes padrão (Helvetica) usam
   WinAnsi, que cobre os acentos do português. */

const PRETO = rgb(0, 0, 0);
const TINTA2 = rgb(0.25, 0.25, 0.25);
const LATAO = rgb(0.722, 0.6, 0.404);
const LINHA = rgb(0, 0, 0);

const A4 = { largura: 595.28, altura: 841.89 };
const M = 42;                       // margem
const L = A4.largura - M * 2;       // largura útil

const money = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function cortar(texto: string, fonte: PDFFont, tam: number, max: number) {
  if (fonte.widthOfTextAtSize(texto, tam) <= max) return texto;
  let t = texto;
  while (t.length > 1 && fonte.widthOfTextAtSize(t + "…", tam) > max) t = t.slice(0, -1);
  return t + "…";
}

/** Quebra inclusive campos sem espaços, como e-mails, sem perder caracteres. */
function linhas(texto: string, fonte: PDFFont, tam: number, max: number) {
  const resultado: string[] = [];
  let atual = "";
  for (const caractere of texto) {
    if (caractere === "\n" || (atual && fonte.widthOfTextAtSize(atual + caractere, tam) > max)) {
      resultado.push(atual.trimEnd());
      atual = "";
    }
    if (caractere !== "\n") atual += caractere;
  }
  if (atual) resultado.push(atual.trimEnd());
  return resultado;
}

/** Põe pontuação em CPF (11) e CNPJ (14); qualquer outro tamanho sai como veio. */
function formatarDoc(v?: string | null) {
  const n = (v ?? "").replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v ?? "";
}

/** Separa "Rua X, 10 · Bairro · Cidade - UF · CEP 00000-000" nas partes do formulário. */
function partesEndereco(linha?: string | null) {
  const p = (linha ?? "").split("·").map((s) => s.trim()).filter(Boolean);
  const cep = p.find((s) => /cep/i.test(s) || /^\d{5}-?\d{3}$/.test(s)) ?? "";
  const cidadeUf = p.find((s) => /\s-\s[A-Z]{2}$/.test(s)) ?? "";
  const [municipio, uf] = cidadeUf ? cidadeUf.split(/\s-\s/) : ["", ""];
  const usados = new Set([cep, cidadeUf]);
  const resto = p.filter((s) => !usados.has(s));
  return {
    endereco: resto[0] ?? "",
    complemento: resto.length > 2 ? resto[1] : "",
    bairro: resto.length > 2 ? resto[2] : (resto[1] ?? ""),
    cep: cep.replace(/cep\s*/i, ""),
    municipio: municipio ?? "",
    uf: uf ?? "",
  };
}

export async function reciboPdf(
  d: DadosPedido,
  opcoes?: { emitidoEm?: Date; site?: string }
): Promise<Uint8Array> {
  const [razao, cnpj, ie, endereco, telefone, logoCaminho] = await Promise.all([
    ler("EMPRESA_RAZAO_SOCIAL"), ler("EMPRESA_CNPJ"), ler("EMPRESA_IE"),
    ler("EMPRESA_ENDERECO"), ler("EMPRESA_TELEFONE"), ler("EMPRESA_LOGO"),
  ]);

  const doc = await PDFDocument.create();
  doc.setTitle(`Comprovante de venda ${d.referencia}`);
  doc.setProducer(razao || "Café com Deus Pai");
  const pag = doc.addPage([A4.largura, A4.altura]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);

  /* O logo é buscado por HTTP: no Worker não há sistema de arquivos. Se
     falhar, o documento sai sem imagem em vez de não sair. */
  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  const site = sitePublicoEmail(opcoes?.site);
  const caminho = logoCaminho || "/marca/logo-transparente.png";
  if (site) {
    try {
      const r = await fetch(caminho.startsWith("http") ? caminho : `${site}${caminho}`);
      if (r.ok) logo = await doc.embedPng(await r.arrayBuffer());
    } catch { /* segue sem logo */ }
  }

  /* ---------- primitivas de desenho ---------- */
  const quadro = (x: number, y: number, w: number, h: number) =>
    pag.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: LINHA, borderWidth: 0.8 });

  const rotulo = (t: string, x: number, y: number, tam = 5.6) =>
    pag.drawText(t, { x: x + 3, y: y - 8, size: tam, font: fb, color: PRETO });

  const valor = (t: string, x: number, y: number, w: number, tam = 8) => {
    let tamanho = tam;
    while (linhas(t, f, tamanho, w - 8).length > 2 && tamanho > 5) tamanho -= 0.25;
    const partes = linhas(t, f, tamanho, w - 8);
    partes.forEach((linha, i) => pag.drawText(linha, {
      x: x + 3, y: y - (partes.length > 1 ? 16 : 19) - i * tamanho,
      size: tamanho, font: f, color: TINTA2,
    }));
  };

  /** Célula com rótulo em cima e valor embaixo. */
  const celula = (rot: string, val: string, x: number, y: number, w: number, h: number) => {
    quadro(x, y, w, h);
    rotulo(rot, x, y);
    valor(val, x, y, w);
  };

  const titulo = (t: string, y: number) =>
    pag.drawText(t, { x: M, y: y - 7, size: 6.5, font: fb, color: PRETO });

  let y = A4.altura - M;

  /* ---------- cabeçalho: logo + nº da venda ---------- */
  const ALT_TOPO = 92;
  const LARG_NUM = 200;
  quadro(M, y, L - LARG_NUM, ALT_TOPO);
  quadro(M + L - LARG_NUM, y, LARG_NUM, ALT_TOPO);

  if (logo) {
    const maxA = ALT_TOPO - 22, maxL = 120;
    const esc = Math.min(maxL / logo.width, maxA / logo.height);
    pag.drawImage(logo, {
      x: M + 12, y: y - ALT_TOPO + (ALT_TOPO - logo.height * esc) / 2,
      width: logo.width * esc, height: logo.height * esc,
    });
    if (razao) {
      pag.drawText(cortar(razao, fb, 8.5, L - LARG_NUM - logo.width * esc - 40),
        { x: M + 24 + logo.width * esc, y: y - ALT_TOPO / 2 - 3, size: 8.5, font: fb, color: PRETO });
    }
  } else if (razao) {
    pag.drawText(cortar(razao, fb, 11, L - LARG_NUM - 24),
      { x: M + 12, y: y - ALT_TOPO / 2, size: 11, font: fb, color: PRETO });
  }

  rotulo("Nº DE VENDA", M + L - LARG_NUM, y, 7);
  const numTam = 22;
  pag.drawText(d.referencia, {
    x: M + L - LARG_NUM + (LARG_NUM - fb.widthOfTextAtSize(d.referencia, numTam)) / 2,
    y: y - ALT_TOPO + 30, size: numTam, font: fb, color: PRETO,
  });
  y -= ALT_TOPO;

  /* ---------- natureza da operação ---------- */
  const ALT_NAT = 26;
  celula("NATUREZA DE OPERAÇÃO", "VENDA", M, y, L * 0.72, ALT_NAT);
  celula("DOCUMENTO", "Comprovante de venda", M + L * 0.72, y, L * 0.28, ALT_NAT);
  y -= ALT_NAT + 14;

  /* ---------- destinatário ---------- */
  titulo("DESTINATÁRIO / REMETENTE", y); y -= 10;
  const e = d.endereco ? {
    endereco: [d.endereco.logradouro, d.endereco.numero].filter(Boolean).join(", "),
    complemento: d.endereco.complemento ?? "",
    bairro: d.endereco.bairro ?? "",
    cep: d.endereco.cep ?? "",
    municipio: d.endereco.localidade ?? "",
    uf: d.endereco.uf ?? "",
  } : partesEndereco(d.enderecoLinha);
  const emitido = opcoes?.emitidoEm ?? new Date();
  const H = 27;

  // linha 1
  celula("NOME / RAZÃO SOCIAL", d.clienteNome ?? "", M, y, L * 0.55, H);
  celula("CPF / CNPJ", formatarDoc(d.clienteDocumento), M + L * 0.55, y, L * 0.2, H);
  celula("DATA DE EMISSÃO", formatarDataBrasilia(emitido), M + L * 0.75, y, L * 0.25, H);
  y -= H;
  // linha 2
  celula("ENDEREÇO", e.endereco, M, y, L * 0.55, H);
  celula("BAIRRO / DISTRITO", e.bairro, M + L * 0.55, y, L * 0.2, H);
  celula("CEP", e.cep, M + L * 0.75, y, L * 0.125, H);
  celula("SAÍDA", formatarDataBrasilia(emitido), M + L * 0.875, y, L * 0.125, H);
  y -= H;
  // linha 3 — e-mail em campo próprio, é como o cliente é contatado
  celula("E-MAIL", d.clienteEmail ?? "", M, y, L * 0.55, H);
  celula("COMPLEMENTO", e.complemento, M + L * 0.55, y, L * 0.45, H);
  y -= H;
  // linha 4
  celula("MUNICÍPIO", e.municipio, M, y, L * 0.34, H);
  celula("TELEFONE", d.clienteTelefone ?? "", M + L * 0.34, y, L * 0.16, H);
  celula("UF", e.uf, M + L * 0.5, y, L * 0.08, H);
  celula("INSCRIÇÃO ESTADUAL", "Isento", M + L * 0.58, y, L * 0.29, H);
  celula("HORA DA SAÍDA", formatarHoraBrasilia(emitido),
    M + L * 0.87, y, L * 0.13, H);
  y -= H + 14;

  /* ---------- produtos ---------- */
  titulo("DADOS DOS PRODUTOS / SERVIÇOS", y); y -= 10;

  const cols = [
    { r: "CÓD.", w: 0.07, al: "c" },
    { r: "DESCRIÇÃO DOS PRODUTOS / SERVIÇOS", w: 0.38, al: "l" },
    { r: "QUANTIDADE", w: 0.11, al: "c" },
    { r: "VAL. UNIT", w: 0.11, al: "r" },
    { r: "DESCONTO", w: 0.11, al: "r" },
    { r: "FRETE", w: 0.1, al: "r" },
    { r: "VALOR", w: 0.12, al: "r" },
  ] as const;

  const ALT_CAB = 16, ALT_LIN = 18, MIN_LINHAS = 8;
  let x = M;
  for (const c of cols) {
    const w = L * c.w;
    quadro(x, y, w, ALT_CAB);
    const t = cortar(c.r, fb, 5.6, w - 6);
    pag.drawText(t, { x: x + (w - fb.widthOfTextAtSize(t, 5.6)) / 2, y: y - 11, size: 5.6, font: fb, color: PRETO });
    x += w;
  }
  y -= ALT_CAB;

  const escreverLinha = (vals: (string | null)[], yl: number) => {
    let xc = M;
    cols.forEach((c, i) => {
      const w = L * c.w;
      quadro(xc, yl, w, ALT_LIN);
      const v = vals[i];
      if (v) {
        const tam = 7.5;
        const larg = f.widthOfTextAtSize(v, tam);
        const px = c.al === "l" ? xc + 4 : c.al === "c" ? xc + (w - larg) / 2 : xc + w - larg - 4;
        pag.drawText(cortar(v, f, tam, w - 8), { x: px, y: yl - 12, size: tam, font: f, color: TINTA2 });
      }
      xc += w;
    });
  };

  const frete = d.freteCentavos > 0 ? money(d.freteCentavos) : "Grátis";
  d.itens.forEach((item, i) => {
    const unit = item.quantidade > 0 ? item.totalCentavos / item.quantidade : 0;
    escreverLinha([
      String(i + 1).padStart(3, "0"),
      item.descricao,
      String(item.quantidade),
      money(unit),
      i === 0 && d.descontoCentavos > 0 ? money(d.descontoCentavos) : null,
      i === 0 ? frete : null,
      money(item.totalCentavos),
    ], y);
    y -= ALT_LIN;
  });
  // linhas em branco, como no formulário impresso
  for (let i = d.itens.length; i < MIN_LINHAS; i++) {
    escreverLinha([null, null, null, null, null, null, null], y);
    y -= ALT_LIN;
  }

  /* total, encostado à direita sob a coluna VALOR */
  const xTotal = M + L * (1 - 0.12);
  quadro(M, y, L * 0.88, 24);
  quadro(xTotal, y, L * 0.12, 24);
  pag.drawText("VALOR TOTAL DA VENDA", { x: M + 6, y: y - 15, size: 7, font: fb, color: PRETO });
  const tt = money(d.totalCentavos);
  pag.drawText(tt, { x: xTotal + L * 0.12 - fb.widthOfTextAtSize(tt, 9.5) - 4, y: y - 16, size: 9.5, font: fb, color: PRETO });
  y -= 24 + 14;

  /* ---------- dados adicionais ---------- */
  titulo("DADOS ADICIONAIS", y); y -= 10;
  const ALT_AD = 92;
  quadro(M, y, L * 0.58, ALT_AD);
  quadro(M + L * 0.58, y, L * 0.42, ALT_AD);
  rotulo("INFORMAÇÕES COMPLEMENTARES", M + L * 0.58, y, 6);

  const linhasEsq = [
    d.codigoRastreio ? `Código de rastreio: ${d.codigoRastreio}` : "Rastreio informado após a postagem.",
    `Pedido nº ${d.referencia}`,
    d.freteTipo ? `Frete: ${d.freteTipo}` : "",
    d.acrescimoCartaoCentavos ? `Juros do parcelamento: R$ ${money(d.acrescimoCartaoCentavos)}` : "",
  ].filter(Boolean);
  let yy = y - 14;
  for (const linha of linhasEsq) {
    pag.drawText(cortar(linha, f, 8, L * 0.58 - 12), { x: M + 6, y: yy, size: 8, font: f, color: TINTA2 });
    yy -= 12;
  }

  const complementares = [
    "Este documento é um comprovante de venda emitido",
    "pelo vendedor. Não é documento fiscal e não substitui",
    "a Nota Fiscal Eletrônica (NF-e).",
  ];
  yy = y - 20;
  for (const linha of complementares) {
    pag.drawText(linha, { x: M + L * 0.58 + 6, y: yy, size: 7, font: f, color: TINTA2 });
    yy -= 10;
  }
  y -= ALT_AD;

  /* filete de latão: assinatura discreta da marca */
  pag.drawRectangle({ x: M, y: y - 12, width: 54, height: 2.5, color: LATAO });
  const emitente = [
    razao && `Razão social: ${razao}`,
    [cnpj && `CNPJ: ${formatarDoc(cnpj)}`, ie && `Inscrição estadual: ${ie}`].filter(Boolean).join("  ·  "),
    endereco && `Endereço: ${endereco}`,
    telefone && `Telefone: ${telefone}`,
  ].filter(Boolean) as string[];
  let rodapeY = y - 26;
  for (const campo of emitente) {
    for (const linha of linhas(campo, f, 7, L)) {
      pag.drawText(linha, { x: M, y: rodapeY, size: 7, font: f, color: TINTA2 });
      rodapeY -= 10;
    }
  }

  return doc.save();
}

/** Base64 para o campo `content` do anexo da Resend. */
export function paraBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export type { PDFPage };
