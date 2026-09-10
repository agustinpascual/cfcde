import "server-only";
import { urlRastreio } from "./rastreio";
import { sitePublicoEmail } from "./site-email";

/* Modelos de e-mail transacional.
   Regras que os clientes de e-mail impõem e que ditam este código:
   - Layout em <table>, não flex nem grid.
   - Estilo inline; <style> no <head> é ignorado ou removido.
   - Sem webfont: pilha do sistema, que degrada bem em todo lugar.
   - Largura fixa de 600px, o consenso que cabe em Outlook e celular.
   Paleta da marca: preto #151515, latão #b89967, creme #f7f5f1. */

const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const PRETO = "#151515";
const LATAO = "#b89967";
const LATAO_ESCURO = "#8a6f42";
const TINTA2 = "#57504a";
const CREME = "#f7f5f1";
const BORDA = "#e4dfd7";



export const money = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Base = { site: string; titulo: string; eyebrow: string; corpo: string };

/** Casca comum: logo, filete de latão, conteúdo e rodapé preto. */
function casca({ site, titulo, eyebrow, corpo }: Base) {
  /* Fica em /public/marca para ter URL estável: e-mail guardado por meses
     não pode depender de um caminho de página que a loja reorganize. */
  const logo = `${site}/marca/logo-transparente.png`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title></head>
<body style="margin:0;padding:0;background:${CREME}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};margin:0;padding:28px 12px;font-family:${FONTE}">
 <tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDA}">

   <tr><td align="center" style="padding:28px 30px 20px">
     <a href="${site}" style="text-decoration:none">
       <!-- width/height explícitos: Outlook ignora CSS de dimensão e estica a
            imagem sem eles. 84x95 mantém a proporção real de 663x746.
            O alt fica estilizado para virar wordmark quando o cliente
            bloqueia imagens, que é o padrão do Gmail e do Outlook. -->
       <img src="${logo}" width="84" height="95" alt="Café com Deus Pai"
         style="display:block;border:0;width:84px;height:95px;font-family:${FONTE};font-size:17px;font-weight:800;color:${PRETO};text-decoration:none">
     </a>
   </td></tr>
   <tr><td style="height:3px;background:${LATAO};font-size:0;line-height:0">&nbsp;</td></tr>

   <tr><td style="padding:30px 34px 0">
     <p style="margin:0 0 7px;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${LATAO_ESCURO}">${eyebrow}</p>
     <h1 style="margin:0 0 16px;font-size:25px;line-height:1.25;color:${PRETO};font-weight:800">${titulo}</h1>
   </td></tr>

   ${corpo}

   <tr><td style="background:${PRETO};padding:24px 34px">
     <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#ffffff">Café com Deus Pai</p>
     <p style="margin:0;font-size:11px;line-height:1.7;color:#6d665c">
       Você recebeu este e-mail porque fez um pedido em cafecomdeusepai.com.
     </p>
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
}

const p = (texto: string) =>
  `<tr><td style="padding:0 34px 14px"><p style="margin:0;font-size:15px;line-height:1.7;color:${TINTA2}">${texto}</p></td></tr>`;

/** Caixa creme para destacar um dado (código PIX, endereço, rastreio). */
const caixa = (titulo: string, conteudo: string) =>
  `<tr><td style="padding:6px 34px 20px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};border:1px solid ${BORDA};border-radius:11px">
     <tr><td style="padding:16px 18px">
       <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${LATAO_ESCURO}">${titulo}</p>
       ${conteudo}
     </td></tr>
    </table>
   </td></tr>`;

/** Botão. <a> com padding, porque <button> não funciona em e-mail. */
const botao = (texto: string, href: string) =>
  `<tr><td style="padding:4px 34px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
     <td style="background:${PRETO};border-radius:8px">
      <a href="${href}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${FONTE}">${texto}</a>
     </td>
    </tr></table>
   </td></tr>`;

export type DadosPedido = {
  referencia: string;
  clienteNome?: string | null;
  clienteDocumento?: string | null;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  endereco?: {
    logradouro?: string; numero?: string; complemento?: string;
    bairro?: string; localidade?: string; uf?: string; cep?: string;
  } | null;
  itens: { descricao: string; quantidade: number; totalCentavos: number }[];
  subtotalCentavos: number;
  descontoCentavos: number;
  freteCentavos: number;
  acrescimoCartaoCentavos?: number;
  freteTipo?: string | null;
  totalCentavos: number;
  enderecoLinha?: string | null;
  codigoRastreio?: string | null;
};

const primeiroNome = (nome?: string | null) => (nome ?? "").trim().split(/\s+/)[0] || "";

/** Tabela de itens + totais, compartilhada pelos dois modelos. */
function itens(d: DadosPedido) {
  const linhas = d.itens.map((i) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${BORDA};font-size:14px;color:${PRETO}">${i.descricao}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${BORDA};font-size:14px;color:${TINTA2};text-align:center;white-space:nowrap">${i.quantidade}×</td>
      <td style="padding:9px 0;border-bottom:1px solid ${BORDA};font-size:14px;color:${PRETO};text-align:right;white-space:nowrap">${money(i.totalCentavos)}</td>
    </tr>`).join("");

  const linha = (rotulo: string, valor: string) => `
    <tr><td colspan="2" style="padding:5px 0;font-size:14px;color:${TINTA2}">${rotulo}</td>
        <td style="padding:5px 0;font-size:14px;color:${TINTA2};text-align:right;white-space:nowrap">${valor}</td></tr>`;

  return `<tr><td style="padding:6px 34px 18px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${linhas}
      ${linha("Subtotal", money(d.subtotalCentavos))}
      ${d.descontoCentavos > 0 ? linha("Desconto", "− " + money(d.descontoCentavos)) : ""}
      ${linha(`Frete${d.freteTipo ? ` (${d.freteTipo})` : ""}`, d.freteCentavos > 0 ? money(d.freteCentavos) : "Grátis")}
      ${d.acrescimoCartaoCentavos && d.acrescimoCartaoCentavos > 0 ? linha("Juros do parcelamento", money(d.acrescimoCartaoCentavos)) : ""}
      <tr>
        <td colspan="2" style="padding:11px 0 0;border-top:2px solid ${PRETO};font-size:16px;font-weight:800;color:${PRETO}">Total</td>
        <td style="padding:11px 0 0;border-top:2px solid ${PRETO};font-size:16px;font-weight:800;color:${PRETO};text-align:right;white-space:nowrap">${money(d.totalCentavos)}</td>
      </tr>
    </table>
   </td></tr>`;
}

/* ---------------- PIX gerado ---------------- */
export function emailPixGerado(site: string, d: DadosPedido & { brcode: string }) {
  site = sitePublicoEmail(site);
  const nome = primeiroNome(d.clienteNome);
  const passos = [
    "Copie o código acima.",
    "Abra o app do seu banco e entre na área <b>PIX</b>.",
    "Escolha <b>PIX Copia e Cola</b> e cole o código.",
    `Confira se o valor é <b>${money(d.totalCentavos)}</b> e confirme.`,
  ].map((t, i) => `
    <tr>
      <td width="26" valign="top" style="padding:0 10px 10px 0">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="24" height="24" align="center" style="background:${LATAO};border-radius:12px;font-size:12px;font-weight:800;color:#fff">${i + 1}</td>
        </tr></table>
      </td>
      <td valign="top" style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${TINTA2}">${t}</td>
    </tr>`).join("");

  return casca({
    site,
    eyebrow: `Pedido ${d.referencia}`,
    titulo: "Seu PIX está pronto",
    corpo:
      p(`${nome ? `${nome}, s` : "S"}eu pedido foi criado e está esperando o pagamento. Copie o código abaixo e cole no app do seu banco.`) +
      /* O código é o herói do e-mail: fundo branco, borda de latão e fonte
         maior que o resto. Não há botão de copiar porque cliente de e-mail
         não roda JavaScript — a instrução de seleção manual é o que de fato
         funciona, e no celular o toque longo cobre tudo. */
      `<tr><td style="padding:6px 34px 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid ${LATAO};border-radius:11px">
         <tr><td style="padding:16px 18px">
           <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${LATAO_ESCURO}">PIX copia e cola</p>
           <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.6;color:${PRETO};word-break:break-all;-webkit-user-select:all;user-select:all">${d.brcode}</p>
         </td></tr>
        </table>
       </td></tr>` +
      `<tr><td style="padding:0 34px 20px">
        <p style="margin:0;font-size:13px;line-height:1.6;color:${TINTA2}">
          <b style="color:${PRETO}">No celular:</b> toque e segure no código até aparecer “Copiar”.
          <br><b style="color:${PRETO}">No computador:</b> selecione o código todo e use Ctrl+C (ou ⌘+C).
        </p>
       </td></tr>` +
      botao("Ou copie com um toque nesta página", `${site}/pagamento`) +
      `<tr><td style="padding:0 34px 10px"><p style="margin:0 0 12px;font-size:15px;font-weight:800;color:${PRETO}">Como pagar</p>
        <table role="presentation" cellpadding="0" cellspacing="0">${passos}</table></td></tr>` +
      itens(d) +
      p(`Assim que o pagamento cair, você recebe a confirmação por aqui. Se o código expirar, é só refazer o pedido — nada foi cobrado.`),
  });
}

/* ---------------- Pagamento aprovado ---------------- */
export function emailPedidoAprovado(site: string, d: DadosPedido) {
  site = sitePublicoEmail(site);
  const nome = primeiroNome(d.clienteNome);
  return casca({
    site,
    eyebrow: `Pedido ${d.referencia}`,
    titulo: "Pagamento confirmado. Obrigado!",
    corpo:
      p(`${nome ? `${nome}, o` : "O"} seu pagamento foi aprovado e o pedido já entrou na fila de separação.`) +
      itens(d) +
      (d.enderecoLinha
        ? caixa("Entrega", `<p style="margin:0;font-size:14px;line-height:1.65;color:${TINTA2}">${d.enderecoLinha}</p>`)
        : "") +
      (d.codigoRastreio
        ? caixa("Código de rastreio",
            `<p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:17px;font-weight:700;letter-spacing:1px;color:${PRETO}">${d.codigoRastreio}</p>`) +
          botao("Rastrear meu pedido", urlRastreio(d.codigoRastreio))
        : p("O código de rastreio chega por e-mail assim que o pedido for postado — em geral em até 5 dias úteis.")) +
      p("Guarde este e-mail: ele é o seu comprovante da compra."),
  });
}
