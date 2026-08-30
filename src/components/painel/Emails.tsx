"use client";
import { useEffect, useRef, useState } from "react";
import e from "./emails.module.css";

type Contato = { email: string; nome: string | null; origem: string; inscrito: boolean };
type Campanha = {
  id: string; nome: string; assunto: string; status: string;
  total: number; enviados: number; falhas: number; criada_em: string;
};

/* Template da marca em tabela e estilo inline: cliente de e-mail não tem flex,
   grid nem <style>. Largura fixa de 600px porque é o que o Outlook respeita.
   As cores saem do globals.css do site — navy #0b2860 e dourado #d4b45d. */
const LOGO = "https://bella-gummy.vercel.app/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/email-logo.png";

const MODELO = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;margin:0;padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden">

      <!-- cabeçalho -->
      <tr><td align="center" style="background:#0b2860;padding:26px 24px">
        <img src="${LOGO}" width="150" alt="Bela Blue Beauty" style="display:block;border:0;width:150px;height:auto">
      </td></tr>

      <!-- faixa dourada -->
      <tr><td style="height:4px;background:#d4b45d;font-size:0;line-height:0">&nbsp;</td></tr>

      <!-- corpo -->
      <tr><td style="padding:34px 34px 8px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#d4b45d">
          Exclusivo para clientes
        </p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#0b2860;font-weight:800">
          Olá, {{nome}}
        </h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#40464f">
          Escreva aqui a abertura do e-mail. Duas ou três linhas funcionam melhor
          que um parágrafo longo.
        </p>
        <p style="margin:0 0 26px;font-size:15px;line-height:1.75;color:#40464f">
          Complete com o que a pessoa ganha lendo até o fim.
        </p>
      </td></tr>

      <!-- destaque -->
      <tr><td style="padding:0 34px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e3e8f0;border-radius:11px">
          <tr><td style="padding:20px 22px">
            <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#0b2860">Título do destaque</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#5b6472">
              Use este bloco para a oferta, o benefício ou o aviso principal.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- botão -->
      <tr><td align="center" style="padding:28px 34px 34px">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="background:#0b2860;border-radius:9px">
            <a href="https://bella-gummy.vercel.app" style="display:inline-block;padding:15px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">
              Ver na loja
            </a>
          </td></tr>
        </table>
      </td></tr>

      <!-- rodapé -->
      <tr><td style="background:#0b2860;padding:26px 34px">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#ffffff">Bela Blue Beauty</p>
        <p style="margin:0 0 14px;font-size:12px;line-height:1.7;color:#a6b6d5">
          Você recebe este e-mail porque comprou ou se cadastrou na nossa loja.
        </p>
        <p style="margin:0;font-size:12px;line-height:1.7;color:#a6b6d5">
          <a href="{{descadastro}}" style="color:#a6b6d5;text-decoration:underline">Não quero mais receber</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>`;

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
  const [arquivo, setArquivo] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

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

  /* CSV de verdade tem cabeçalho, aspas e colunas em qualquer ordem. Em vez de
     adivinhar o formato, jogamos tudo no campo — o servidor já sabe achar o
     e-mail em cada linha e tratar o resto como nome. */
  function lerArquivo(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      setAviso({ tipo: "erro", texto: "Arquivo muito grande (máx. 5 MB)." });
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      const bruto = String(leitor.result ?? "");
      const linhas = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      // descarta o cabeçalho quando a primeira linha não tem e-mail nenhum
      const semCabecalho = linhas.length > 1 && !/@/.test(linhas[0]) ? linhas.slice(1) : linhas;

      const limpas = semCabecalho.map((l) =>
        l.replace(/"/g, "").replace(/\t/g, ",").trim()
      );

      setLista((antes) => (antes.trim() ? `${antes.trim()}\n${limpas.join("\n")}` : limpas.join("\n")));
      setArquivo(`${f.name} · ${limpas.length} linha${limpas.length === 1 ? "" : "s"}`);
      setAviso(null);
    };
    leitor.onerror = () => setAviso({ tipo: "erro", texto: "Não consegui ler o arquivo." });
    leitor.readAsText(f, "utf-8");
  }

  async function importar() {
    const d = await acao({ acao: "importar", lista }, "importar");
    if (d) {
      setLista("");
      setArquivo(null);
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

          <div
            className={e.solta}
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={(ev) => {
              ev.preventDefault();
              const f = ev.dataTransfer.files?.[0];
              if (f) lerArquivo(f);
            }}
          >
            <input
              ref={arquivoRef}
              type="file"
              hidden
              accept=".csv,.txt,text/csv,text/plain"
              onChange={(ev) => { const f = ev.target.files?.[0]; if (f) lerArquivo(f); ev.target.value = ""; }}
            />
            <button type="button" className={e.btnArquivo} onClick={() => arquivoRef.current?.click()}>
              Escolher arquivo
            </button>
            <span className={e.soltaDica}>
              {arquivo ?? "ou arraste um .csv aqui — o conteúdo entra no campo abaixo"}
            </span>
          </div>

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
