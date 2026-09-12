import { supabaseAdmin } from "@/lib/supabase/servidor";
import { formatarDataHoraBrasilia } from "@/lib/data-brasilia";
import s from "./painel.module.css";
import d from "./pedido.module.css";

export async function pedidosComComprovante(ids: string[]): Promise<Set<string>> {
  const db = supabaseAdmin();
  if (!db || !ids.length) return new Set();
  const { data } = await db.from("pix_comprovantes").select("pedido_id").in("pedido_id", ids);
  return new Set((data ?? []).map(r => r.pedido_id));
}

const resultado = (v: boolean | null) => v === true ? "Compatível" : v === false ? "Divergente — conferir" : "Não disponível";
const moeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

export default async function ComprovantePedido({ pedidoId, status }: { pedidoId: string; status: string }) {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data: c, error } = await db.from("pix_comprovantes").select(
    "mime,recebido_em,copiado_em,nome_informado,valor_informado,horario_informado,mesmo_ip,nome_compativel,valor_compativel,horario_compativel",
  ).eq("pedido_id", pedidoId).maybeSingle();
  if (error) return <section className={`${s.cartao} ${d.bloco} ${d.blocoLargo}`}><h2 className={d.titulo}>Comprovante Pix</h2><p>Não foi possível consultar os comprovantes. Verifique a conexão e se a migration 0027 foi aplicada.</p></section>;
  if (!c) return null;
  const arquivo = `/api/painel/pedidos/${encodeURIComponent(pedidoId)}/comprovante`;
  const finalizado = status === "aprovado" || status === "estornado";
  return <section className={`${s.cartao} ${d.bloco} ${d.blocoLargo}`}>
    <h2 className={d.titulo}>Comprovante enviado pelo cliente</h2>
    <p className={d.comprovanteAviso} role="status">{finalizado
      ? "Arquivo mantido para conferência. O estado do pagamento é o exibido no pedido."
      : "⚠ Comprovante enviado — aguardando confirmação. Não liberar o pedido apenas com este arquivo."}</p>
    <div className={d.comprovanteGrade}>
      <div>
        {c.mime === "application/pdf" ? <p>Comprovante em PDF. Baixe para conferir o documento.</p> : (
          // Endpoint privado exige a sessão do admin; não passa pelo cache do otimizador.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={arquivo} alt="Comprovante Pix enviado pelo cliente, ainda sujeito a conferência" className={d.comprovanteImagem} loading="lazy" />
        )}
        <a href={arquivo} target="_blank" rel="noopener noreferrer" className={d.linkRecibo}>{c.mime === "application/pdf" ? "Baixar PDF" : "Abrir imagem do comprovante"}</a>
      </div>
      <div>
        <dl className={d.campos}>
          <div><dt>Recebido no servidor</dt><dd>{formatarDataHoraBrasilia(c.recebido_em)}</dd></div>
          <div><dt>Cópia informada pelo navegador</dt><dd>{c.copiado_em ? formatarDataHoraBrasilia(c.copiado_em) : "Não registrada (pode ter usado QR Code)"}</dd></div>
          <div><dt>Nome informado</dt><dd>{c.nome_informado} · {resultado(c.nome_compativel)}</dd></div>
          <div><dt>Valor informado</dt><dd>{moeda(c.valor_informado)} · {resultado(c.valor_compativel)}</dd></div>
          <div><dt>Horário informado (Brasília)</dt><dd>{formatarDataHoraBrasilia(c.horario_informado)} · {resultado(c.horario_compativel)}</dd></div>
          <div><dt>IP na geração e no envio</dt><dd>{c.mesmo_ip === null ? "Não disponível" : c.mesmo_ip ? "Mesmo IP observado" : "IP diferente — pode ter trocado de rede"}</dd></div>
        </dl>
        <p className={d.comprovanteNota}>Nome, valor e horário foram digitados pelo cliente, não extraídos do arquivo. A comparação não valida sua autenticidade. Confira visualmente pagador, destinatário, valor, data, status efetivado e identificador da transação, e confirme o recebimento na adquirente. O IP é apenas um indício, não prova de pagamento. Arquivos não passaram por antivírus.</p>
      </div>
    </div>
  </section>;
}
