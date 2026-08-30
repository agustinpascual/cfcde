"use client";
import { useEffect, useState } from "react";
import e from "./emails.module.css";

type Contato = { email: string; nome: string | null; origem: string; inscrito: boolean };
type Campanha = {
  id: string; nome: string; assunto: string; status: string;
  total: number; enviados: number; falhas: number; criada_em: string;
};

const MODELO = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#1f2937">
  <h1 style="font-size:22px;margin:0 0 14px">Olá, {{nome}}!</h1>
  <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
    Escreva aqui a sua mensagem.
  </p>
  <p style="margin:26px 0 0">
    <a href="https://bella-gummy.vercel.app" style="display:inline-block;background:#111827;color:#fff;padding:13px 26px;border-radius:9px;text-decoration:none;font-weight:600">
      Ver na loja
    </a>
  </p>
  <hr style="border:0;border-top:1px solid #e5e7eb;margin:30px 0 14px">
  <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0">
    Você recebe este e-mail porque comprou ou se cadastrou na Bela Blue Beauty.<br>
    <a href="{{descadastro}}" style="color:#9ca3af">Não quero mais receber</a>
  </p>
</div>`;

export default function Emails() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [inscritos, setInscritos] = useState(0);

  const [lista, setLista] = useState("");
  const [nome, setNome] = useState("");
  const [assunto, setAssunto] = useState("");
  const [html, setHtml] = useState(MODELO);
  const [teste, setTeste] = useState("");

  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  /* A busca vive dentro do efeito e todo setState vem depois de um await —
     assim não há render em cascata. `versao` força reler após cada ação. */
  useEffect(() => {
    let vivo = true;
    async function buscar() {
      try {
        const r = await fetch("/api/painel/emails", { cache: "no-store" });
        if (!r.ok || !vivo) return;
        const d = await r.json();
        if (!vivo) return;
        setContatos(d.contatos ?? []);
        setCampanhas(d.campanhas ?? []);
        setInscritos(d.inscritos ?? 0);
        if (d.erro) setAviso({ tipo: "erro", texto: d.erro });
      } catch { /* tenta na próxima ação */ }
    }
    void buscar();
    return () => { vivo = false; };
  }, [versao]);

  async function acao(corpo: Record<string, unknown>, rotulo: string) {
    setOcupado(rotulo);
    setAviso(null);
    try {
      const r = await fetch("/api/painel/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await r.json();
      if (!r.ok) { setAviso({ tipo: "erro", texto: d.erro ?? "Falhou." }); return null; }
      recarregar();
      return d;
    } catch {
      setAviso({ tipo: "erro", texto: "Sem conexão." });
      return null;
    } finally {
      setOcupado(null);
    }
  }

  async function importar() {
    const d = await acao({ acao: "importar", lista }, "importar");
    if (d) {
      setLista("");
      setAviso({
        tipo: "ok",
        texto: `${d.importados} importados · ${d.repetidos} repetidos · ${d.invalidos} inválidos.`,
      });
    }
  }

  async function importarPedidos() {
    const d = await acao({ acao: "importar_pedidos" }, "pedidos");
    if (d) setAviso({ tipo: "ok", texto: `${d.importados} e-mails vindos de pedidos.` });
  }

  async function enviarTeste() {
    const d = await acao({ acao: "teste", teste, assunto, html }, "teste");
    if (d) setAviso({ tipo: "ok", texto: `Teste enviado para ${teste}.` });
  }

  async function disparar() {
    setConfirmar(false);
    const d = await acao({ acao: "disparar", nome, assunto, html }, "disparar");
    if (d) setAviso({ tipo: "ok", texto: `${d.enviados} enviados · ${d.falhas} falhas de ${d.total}.` });
  }

  const semDescadastro = !/\{\{\s*descadastro\s*\}\}/i.test(html);
  const podeDisparar = Boolean(assunto.trim() && html.trim() && inscritos && !semDescadastro);

  return (
    <>
      {aviso && (
        <p className={aviso.tipo === "ok" ? e.avisoOk : e.avisoErro} role="status">{aviso.texto}</p>
      )}

      <div className={e.colunas}>
        {/* ---------- lista ---------- */}
        <section className={e.bloco}>
          <h2 className={e.titulo}>Lista de contatos</h2>
          <p className={e.nota}>
            <strong>{inscritos}</strong> inscritos de {contatos.length} cadastrados.
            Quem pediu para sair fica na base, marcado, e nunca mais recebe — reimportar
            a lista não traz ninguém de volta.
          </p>

          <textarea
            className={e.campoLista}
            value={lista}
            onChange={(ev) => setLista(ev.target.value)}
            placeholder={"Cole os e-mails, um por linha.\nAceita \"nome,email\" e \"Nome <email>\" também."}
            rows={7}
          />
          <div className={e.acoes}>
            <button type="button" className={e.btnPrim} onClick={importar} disabled={!lista.trim() || ocupado !== null}>
              {ocupado === "importar" ? "Importando…" : "Importar lista"}
            </button>
            <button type="button" className={e.btnSec} onClick={importarPedidos} disabled={ocupado !== null}>
              {ocupado === "pedidos" ? "Puxando…" : "Puxar de quem já comprou"}
            </button>
          </div>

          {contatos.length > 0 && (
            <ul className={e.contatos}>
              {contatos.slice(0, 12).map((c) => (
                <li key={c.email} className={c.inscrito ? "" : e.saiu}>
                  <span>{c.nome || "—"}</span>
                  <code>{c.email}</code>
                  <span className={e.origem}>{c.inscrito ? c.origem : "saiu"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- campanha ---------- */}
        <section className={e.bloco}>
          <h2 className={e.titulo}>Mensagem</h2>

          <label className={e.rotulo}>Nome interno da campanha</label>
          <input className={e.campo} value={nome} onChange={(ev) => setNome(ev.target.value)}
            placeholder="Ex.: Novidade de setembro" />

          <label className={e.rotulo}>Assunto</label>
          <input className={e.campo} value={assunto} onChange={(ev) => setAssunto(ev.target.value)}
            placeholder="Aceita {{nome}} para personalizar" />

          <label className={e.rotulo}>Conteúdo (HTML)</label>
          <textarea className={e.campoHtml} value={html} onChange={(ev) => setHtml(ev.target.value)} rows={14} spellCheck={false} />
          {semDescadastro && (
            <p className={e.avisoErro}>
              Falta <code>{"{{descadastro}}"}</code> no conteúdo. Sem link de saída o disparo é
              bloqueado, e provedor sério recusa quem manda sem ele.
            </p>
          )}

          <label className={e.rotulo}>Prévia</label>
          <iframe className={e.previa} title="Prévia do e-mail" srcDoc={html} sandbox="" />

          <div className={e.acoes}>
            <input className={e.campoTeste} value={teste} onChange={(ev) => setTeste(ev.target.value)}
              placeholder="seu@email.com" type="email" aria-label="E-mail de teste" />
            <button type="button" className={e.btnSec} onClick={enviarTeste}
              disabled={!teste.trim() || !assunto.trim() || ocupado !== null}>
              {ocupado === "teste" ? "Enviando…" : "Enviar teste"}
            </button>
          </div>

          {!confirmar ? (
            <button type="button" className={e.btnDisparo} onClick={() => setConfirmar(true)} disabled={!podeDisparar || ocupado !== null}>
              Disparar para {inscritos} contatos
            </button>
          ) : (
            <div className={e.confirmar}>
              <p>Enviar para <strong>{inscritos}</strong> pessoas agora? Isso não tem como cancelar no meio.</p>
              <span>
                <button type="button" className={e.btnSec} onClick={() => setConfirmar(false)}>Cancelar</button>
                <button type="button" className={e.btnDisparo} onClick={disparar} disabled={ocupado !== null}>
                  {ocupado === "disparar" ? "Disparando…" : "Confirmar disparo"}
                </button>
              </span>
            </div>
          )}
        </section>
      </div>

      {campanhas.length > 0 && (
        <section className={e.bloco}>
          <h2 className={e.titulo}>Disparos anteriores</h2>
          <table className={e.tabela}>
            <thead>
              <tr><th>Campanha</th><th>Assunto</th><th>Status</th><th>Enviados</th><th>Falhas</th><th>Data</th></tr>
            </thead>
            <tbody>
              {campanhas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.assunto}</td>
                  <td><span className={`${e.selo} ${e[c.status] ?? ""}`}>{c.status}</span></td>
                  <td>{c.enviados}/{c.total}</td>
                  <td>{c.falhas}</td>
                  <td>{new Date(c.criada_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
