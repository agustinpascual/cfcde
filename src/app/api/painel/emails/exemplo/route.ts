import { NextResponse } from "next/server";
import { enviarUm } from "@/lib/email";
import { emailPedidoAprovado, emailPixGerado, type DadosPedido } from "@/lib/emails-modelos";
import { paraBase64, reciboPdf } from "@/lib/recibo-pdf";
import { autenticado } from "@/lib/painel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Manda para um endereço escolhido o e-mail transacional que o cliente
   receberia, com dados de exemplo. Serve para conferir o visual num cliente
   de e-mail real — o que nenhuma prévia no navegador reproduz fielmente. */

const NOMES = ["Maria Oliveira", "João Ferreira", "Ana Beatriz Souza", "Carlos Menezes", "Luciana Prado"];
const RUAS = ["Rua das Flores, 240", "Av. Brasil, 1180", "Rua São Jorge, 57", "Rua das Acácias, 903"];
const CIDADES = ["Itajaí - SC", "Curitiba - PR", "Taubaté - SP", "Belo Horizonte - MG"];
const sorteia = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/* Rastreio de teste no formato dos Correios: 2 letras + 9 dígitos + BR. */
function rastreioTeste() {
  const n = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  return `AA${n}BR`;
}

const EXEMPLO: DadosPedido = {
  referencia: "392482",
  clienteNome: "Maria Oliveira",
  clienteDocumento: "12345678909",
  clienteTelefone: "(47) 99123-4567",
  itens: [
    { descricao: "Café com Deus Pai vol. 6 (brochura)", quantidade: 1, totalCentavos: 9990 },
    { descricao: "Caneca Café com Deus Pai", quantidade: 2, totalCentavos: 11000 },
  ],
  subtotalCentavos: 20990,
  descontoCentavos: 2099,
  freteCentavos: 0,
  freteTipo: "Correios - PAC",
  totalCentavos: 18891,
  enderecoLinha: "Rua das Flores, 240 · Centro · Itajaí - SC · CEP 88301-550",
};

const BRCODE_EXEMPLO =
  "00020126580014BR.GOV.BCB.PIX0136f1a2b3c4-d5e6-7890-abcd-ef12345678905204000053039865802BR" +
  "5925CAFE COM DEUS PAI COMERCI6009ITAJAI SC62070503***6304A1B2";

export async function POST(req: Request) {
  if (!(await autenticado())) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const para = String(corpo?.para ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(para)) {
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const quais = Array.isArray(corpo?.modelos) ? (corpo.modelos as string[]) : ["pix", "aprovado"];

  /* Cada exemplo sai com cliente e rastreio diferentes: assim dá para ver o
     modelo com nomes de tamanhos variados, que é onde o layout costuma quebrar. */
  const dados: DadosPedido = {
    ...EXEMPLO,
    referencia: String(Math.floor(100000 + Math.random() * 900000)),
    clienteNome: sorteia(NOMES),
    enderecoLinha: `${sorteia(RUAS)} · ${sorteia(CIDADES)} · CEP 88301-550`,
    codigoRastreio: typeof corpo?.codigo === "string" && corpo.codigo.trim()
      ? corpo.codigo.trim().toUpperCase()
      : rastreioTeste(),
  };

  const enviados: string[] = [];
  const falhas: { modelo: string; erro: string }[] = [];

  for (const modelo of quais) {
    try {
      if (modelo === "pix") {
        /* O PIX ainda não foi pago: nada de recibo nem rastreio aqui. */
        const semRastreio = { ...dados, codigoRastreio: null };
        await enviarUm(para, `Seu PIX do pedido ${dados.referencia} · Café com Deus Pai`,
          emailPixGerado(site, { ...semRastreio, brcode: BRCODE_EXEMPLO }));
      } else if (modelo === "aprovado") {
        // O recibo em PDF vai anexado, gerado com os dados salvos da empresa.
        const pdf = await reciboPdf(dados);
        await enviarUm(para, `Pagamento confirmado · pedido ${dados.referencia}`,
          emailPedidoAprovado(site, dados),
          [{ filename: `recibo-${dados.referencia}.pdf`, content: paraBase64(pdf) }]);
      } else {
        falhas.push({ modelo, erro: "modelo desconhecido" });
        continue;
      }
      enviados.push(modelo);
    } catch (e) {
      falhas.push({ modelo, erro: (e as Error).message.slice(0, 200) });
    }
  }

  return NextResponse.json({ ok: falhas.length === 0, enviados, falhas }, { status: falhas.length ? 502 : 200 });
}

/** Abre o recibo em PDF no navegador, sem enviar e-mail. Serve para conferir
    o layout depois de mexer nos dados da empresa ou no gerador. */
export async function GET() {
  if (!(await autenticado())) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  const pdf = await reciboPdf({
    ...EXEMPLO,
    clienteNome: sorteia(NOMES),
    enderecoLinha: `${sorteia(RUAS)} · ${sorteia(CIDADES)} · CEP 88301-550`,
    codigoRastreio: rastreioTeste(),
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-exemplo.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
