"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import w from "./whatsapp.module.css";

/* Duas colunas no estilo WhatsApp Web: lista à esquerda, thread à direita.
   A lista atualiza a cada 8s e a conversa aberta a cada 4s — a Z-API entrega
   por webhook, então aqui só precisamos reler o banco. */

export type Conversa = {
  id: string; telefone: string; nome: string | null; status: string;
  robo_ativo: boolean; ultima_msg: string | null; ultima_em: string; nao_lidas: number;
};
export type Mensagem = {
  id: number; autor: "cliente" | "robo" | "atendente"; texto: string;
  midia_url: string | null; midia_tipo: string | null;
  enviada: boolean; erro: string | null; criado_em: string;
};

const PING_LISTA = 8000;
const PING_THREAD = 4000;

/* 55 + DDD + 9 dígitos (celular) ou 8 (fixo). Fatiar sempre em 9 quebrava o
   número de 8, que saía como (47) 92056-524. */
function formataTel(t: string) {
  const d = t.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

function quando(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaCheio = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export default function Conversas({ inicial }: { inicial: Conversa[] }) {
  const [conversas, setConversas] = useState(inicial);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [versao, setVersao] = useState(0);   // incrementar força reler a thread
  const [confirmando, setConfirmando] = useState(false);
  const [anexo, setAnexo] = useState<{ dataUrl: string; nome: string; tipo: "imagem" | "audio" | "arquivo" } | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const arquivoRef = useRef<HTMLInputElement>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  const fim = useRef<HTMLDivElement>(null);
  const ultimaId = useRef<number>(0);

  const atual = conversas.find((c) => c.id === aberta) ?? null;

  /* --- lista --- */
  const recarregarLista = useCallback(async () => {
    try {
      const r = await fetch("/api/painel/conversas", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setConversas(d.conversas ?? []);
    } catch { /* rede caiu; tenta no próximo ciclo */ }
  }, []);

  useEffect(() => {
    const t = setInterval(recarregarLista, PING_LISTA);
    return () => clearInterval(t);
  }, [recarregarLista]);

  /* --- thread aberta ---
     A busca vive dentro do efeito e todo setState acontece depois de um await,
     então não há render em cascata. `versao` é o gancho para reler na hora
     depois de enviar uma mensagem, sem duplicar a lógica. */
  useEffect(() => {
    if (!aberta) return;
    let vivo = true;

    async function carregar(id: string) {
      try {
        const r = await fetch(`/api/painel/conversas/${id}`, { cache: "no-store" });
        if (!r.ok || !vivo) return;
        const d = await r.json();
        if (!vivo) return;
        setMensagens(d.mensagens ?? []);
        setCarregado(true);
        if (d.conversa) {
          setConversas((antes) => antes.map((c) => (c.id === id ? { ...c, ...d.conversa } : c)));
        }
      } catch { /* rede caiu; tenta no próximo ciclo */ }
    }

    void carregar(aberta);
    const t = setInterval(() => void carregar(aberta), PING_THREAD);
    return () => { vivo = false; clearInterval(t); };
  }, [aberta, versao]);

  /* cronômetro da gravação */
  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [gravando]);

  /* rola para o fim só quando chega mensagem nova, não a cada ping */
  useEffect(() => {
    const ultima = mensagens[mensagens.length - 1];
    if (ultima && ultima.id !== ultimaId.current) {
      ultimaId.current = ultima.id;
      fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [mensagens]);

  function lerArquivo(f: File) {
    if (f.size > 8 * 1024 * 1024) { setErro("Arquivo muito grande (máx. 8 MB)."); return; }
    const leitor = new FileReader();
    leitor.onload = () => {
      const tipo = f.type.startsWith("image/") ? "imagem" : f.type.startsWith("audio/") ? "audio" : "arquivo";
      setAnexo({ dataUrl: String(leitor.result), nome: f.name, tipo });
      setErro(null);
    };
    leitor.readAsDataURL(f);
  }

  async function gravar() {
    if (gravando) {   // parar
      gravadorRef.current?.stop();
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(fluxo);
      pedacosRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) pedacosRef.current.push(ev.data); };
      rec.onstop = () => {
        fluxo.getTracks().forEach((t) => t.stop());   // solta o microfone
        const blob = new Blob(pedacosRef.current, { type: rec.mimeType || "audio/webm" });
        const leitor = new FileReader();
        leitor.onload = () => setAnexo({ dataUrl: String(leitor.result), nome: "audio.ogg", tipo: "audio" });
        leitor.readAsDataURL(blob);
        setGravando(false);
      };
      rec.start();
      gravadorRef.current = rec;
      setSegundos(0);
      setGravando(true);
      setErro(null);
    } catch {
      setErro("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = rascunho.trim();
    if ((!texto && !anexo) || !aberta || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/painel/conversas/${aberta}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          ...(anexo ? { midia: anexo.dataUrl, midiaTipo: anexo.tipo, midiaNome: anexo.nome } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.erro ?? "Não foi possível enviar."); return; }
      setRascunho("");
      setAnexo(null);
      setVersao((v) => v + 1);
      await recarregarLista();
    } catch {
      setErro("Sem conexão. A mensagem não foi enviada.");
    } finally {
      setEnviando(false);
    }
  }

  async function apagar() {
    if (!atual) return;
    const id = atual.id;
    // some da tela na hora; se o servidor recusar, a lista volta no próximo ping
    setConversas((a) => a.filter((c) => c.id !== id));
    setAberta(null);
    setMensagens([]);
    setConfirmando(false);
    const r = await fetch(`/api/painel/conversas/${id}`, { method: "DELETE" });
    if (!r.ok) { setErro("Não foi possível apagar a conversa."); await recarregarLista(); }
  }

  async function alternarRobo() {
    if (!atual) return;
    const novo = !atual.robo_ativo;
    setConversas((a) => a.map((c) => (c.id === atual.id ? { ...c, robo_ativo: novo } : c)));
    await fetch(`/api/painel/conversas/${atual.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ robo_ativo: novo }),
    });
  }

  const filtradas = busca.trim()
    ? conversas.filter((c) => {
        const q = busca.toLowerCase();
        return (c.nome ?? "").toLowerCase().includes(q) || c.telefone.includes(q.replace(/\D/g, ""));
      })
    : conversas;

  /* separa por dia, como o WhatsApp */
  let diaAnterior = "";

  return (
    <div className={`${w.painelChat} ${aberta ? w.comAberta : ""}`}>
      {/* ---------- coluna esquerda ---------- */}
      <aside className={w.coluna}>
        <div className={w.buscaBox}>
          <input
            className={w.busca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou número"
            aria-label="Buscar conversa"
          />
        </div>

        {filtradas.length === 0 ? (
          <p className={w.listaVazia}>
            {conversas.length === 0
              ? "Nenhuma conversa ainda. Elas aparecem assim que a Z-API entregar a primeira mensagem."
              : "Nada encontrado."}
          </p>
        ) : (
          <ul className={w.lista}>
            {filtradas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`${w.item} ${c.id === aberta ? w.itemAtivo : ""}`}
                  onClick={() => { setAberta(c.id); setMensagens([]); setCarregado(false); setErro(null); }}
                  aria-current={c.id === aberta ? "true" : undefined}
                >
                  <span className={w.avatar} aria-hidden>
                    {(c.nome ?? c.telefone).trim().charAt(0).toUpperCase()}
                  </span>
                  <span className={w.corpo}>
                    <span className={w.linhaTopo}>
                      <strong className={w.nome}>{c.nome || formataTel(c.telefone)}</strong>
                      <span className={w.hora}>{quando(c.ultima_em)}</span>
                    </span>
                    <span className={w.linhaBaixo}>
                      <span className={w.previa}>{c.ultima_msg ?? "—"}</span>
                      {c.nao_lidas > 0 && <span className={w.naoLidas}>{c.nao_lidas}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ---------- coluna direita ---------- */}
      <section className={w.thread}>
        {!atual ? (
          <div className={w.threadVazia}>
            <p className={w.threadVaziaTitulo}>Selecione uma conversa</p>
            <p>Clique em um número à esquerda para ver o histórico completo e responder.</p>
          </div>
        ) : (
          <>
            <header className={w.threadTopo}>
              <button type="button" className={w.voltar} onClick={() => setAberta(null)} aria-label="Voltar para a lista">←</button>
              <span className={w.avatar} aria-hidden>
                {(atual.nome ?? atual.telefone).trim().charAt(0).toUpperCase()}
              </span>
              <span className={w.threadInfo}>
                <strong>{atual.nome || formataTel(atual.telefone)}</strong>
                <span className={w.threadTel}>{formataTel(atual.telefone)}</span>
              </span>
              <button
                type="button"
                className={`${w.chaveRobo} ${atual.robo_ativo ? w.chaveOn : w.chaveOff}`}
                onClick={alternarRobo}
              >
                Robô {atual.robo_ativo ? "ligado" : "desligado"}
              </button>
              <button
                type="button"
                className={w.btnApagar}
                onClick={() => setConfirmando(true)}
                aria-label="Apagar conversa"
                title="Apagar conversa"
              >
                Apagar
              </button>
            </header>

            {confirmando && (
              <div className={w.confirmar} role="alertdialog" aria-label="Confirmar exclusão">
                <p>
                  Apagar a conversa com <strong>{atual.nome || formataTel(atual.telefone)}</strong>?
                  As mensagens somem junto e isso não tem volta.
                </p>
                <span className={w.confirmarBotoes}>
                  <button type="button" className={w.confirmarNao} onClick={() => setConfirmando(false)}>
                    Cancelar
                  </button>
                  <button type="button" className={w.confirmarSim} onClick={apagar}>
                    Apagar
                  </button>
                </span>
              </div>
            )}

            <div className={w.baloes}>
              {!carregado ? (
                <p className={w.carregando}>Carregando conversa…</p>
              ) : mensagens.length === 0 ? (
                <p className={w.carregando}>Nenhuma mensagem nesta conversa.</p>
              ) : (
                mensagens.map((m) => {
                  const dia = diaCheio(m.criado_em);
                  const novoDia = dia !== diaAnterior;
                  diaAnterior = dia;
                  const meu = m.autor !== "cliente";
                  return (
                    <div key={m.id}>
                      {novoDia && <p className={w.separadorDia}><span>{dia}</span></p>}
                      <div className={`${w.balao} ${meu ? w.balaoMeu : w.balaoDele}`}>
                        {m.autor === "robo" && <span className={w.etiquetaRobo}>robô</span>}
                        {m.midia_url && m.midia_tipo === "imagem" && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img className={w.balaoMidia} src={m.midia_url} alt="Imagem enviada" />
                        )}
                        {m.midia_url && m.midia_tipo === "audio" && (
                          <audio className={w.balaoAudio} src={m.midia_url} controls preload="none" />
                        )}
                        {m.midia_url && m.midia_tipo === "arquivo" && (
                          <a className={w.balaoArquivo} href={m.midia_url} download target="_blank" rel="noreferrer">
                            📎 Abrir arquivo
                          </a>
                        )}
                        <span className={w.balaoTexto}>{m.texto}</span>
                        <span className={w.balaoRodape}>
                          {hora(m.criado_em)}
                          {meu && (m.erro ? <span className={w.falhou} title={m.erro}> · falhou</span>
                            : !m.enviada ? " · enviando" : " ✓")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={fim} />
            </div>

            {gravando && (
              <div className={w.barraGravando} role="status">
                <span>Gravando… {String(Math.floor(segundos / 60)).padStart(2, "0")}:{String(segundos % 60).padStart(2, "0")}</span>
                <button type="button" onClick={gravar}>Parar</button>
              </div>
            )}

            {anexo && (
              <div className={w.anexoPrevia}>
                {anexo.tipo === "imagem" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={anexo.dataUrl} alt="" />
                ) : (
                  <span aria-hidden>{anexo.tipo === "audio" ? "🎤" : "📎"}</span>
                )}
                <span>{anexo.tipo === "audio" ? "Áudio gravado" : anexo.nome}</span>
                <button type="button" onClick={() => setAnexo(null)}>Remover</button>
              </div>
            )}

            <form className={w.escrever} onSubmit={enviar}>
              <input
                ref={arquivoRef}
                type="file"
                hidden
                accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) lerArquivo(f); e.target.value = ""; }}
              />
              <span className={w.acoesEscrever}>
                <button type="button" className={w.btnIcone} onClick={() => arquivoRef.current?.click()}
                  disabled={gravando} aria-label="Anexar arquivo" title="Anexar imagem, PDF ou documento">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.2-9.2a3.67 3.67 0 1 1 5.18 5.19l-9.2 9.19a1.83 1.83 0 1 1-2.6-2.59l8.5-8.49" />
                  </svg>
                </button>
                <button type="button" className={`${w.btnIcone} ${gravando ? w.gravando : ""}`} onClick={gravar}
                  aria-label={gravando ? "Parar gravação" : "Gravar áudio"} title={gravando ? "Parar gravação" : "Gravar áudio"}>
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2.5" width="6" height="11.5" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
                  </svg>
                </button>
              </span>
              <textarea
                className={w.campo}
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onKeyDown={(e) => {
                  // Enter envia, Shift+Enter quebra linha
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(e); }
                }}
                placeholder="Escreva uma mensagem"
                rows={1}
                aria-label="Mensagem"
              />
              <button type="submit" className={w.btnEnviar} disabled={(!rascunho.trim() && !anexo) || enviando}>
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </form>
            {erro && <p className={w.erroEnvio} role="alert">{erro}</p>}
          </>
        )}
      </section>
    </div>
  );
}
