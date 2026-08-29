import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import { lerAoVivo } from "@/components/painel/dados";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import i from "@/components/painel/integracoes.module.css";

export const metadata: Metadata = { title: "Integrações", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Estado = "ok" | "parcial" | "faltando";

function estado(...vars: (string | undefined)[]): Estado {
  const preenchidas = vars.filter(Boolean).length;
  if (preenchidas === 0) return "faltando";
  return preenchidas === vars.length ? "ok" : "parcial";
}

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");
  const vivos = await lerAoVivo();

  const itens = [
    {
      nome: "PinPay", papel: "Cobranças PIX e webhook de pagamento",
      estado: estado(process.env.PINPAY_TOKEN, process.env.PINPAY_WEBHOOK_SECRET),
      vars: [
        { chave: "PINPAY_TOKEN", ok: !!process.env.PINPAY_TOKEN, nota: "chave sk_ (só servidor)" },
        { chave: "PINPAY_WEBHOOK_SECRET", ok: !!process.env.PINPAY_WEBHOOK_SECRET, nota: "whsec_ do endpoint" },
      ],
      passos: ["Cadastrar https://bella-gummy.vercel.app/api/webhooks/pinpay no painel da PinPay", "Marcar o evento payment_approved"],
    },
    {
      nome: "Supabase", papel: "Banco de pedidos, sessões e eventos",
      estado: estado(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY),
      vars: [
        { chave: "NEXT_PUBLIC_SUPABASE_URL", ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL, nota: "pública" },
        { chave: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, nota: "pública, protegida por RLS" },
        { chave: "SUPABASE_SERVICE_ROLE_KEY", ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY, nota: "ignora RLS — só servidor" },
      ],
      passos: ["Rodar supabase/migrations/0001_pedidos.sql", "Rodar supabase/migrations/0002_analytics.sql"],
    },
    {
      nome: "Resend", papel: "E-mails transacionais: confirmação de pedido e pagamento",
      estado: estado(process.env.RESEND_API_KEY, process.env.RESEND_REMETENTE),
      vars: [
        { chave: "RESEND_API_KEY", ok: !!process.env.RESEND_API_KEY, nota: "re_… (só servidor)" },
        { chave: "RESEND_REMETENTE", ok: !!process.env.RESEND_REMETENTE, nota: 'ex.: "Bela Blue <pedidos@seudominio.com>"' },
      ],
      passos: ["Verificar o domínio no painel da Resend (SPF + DKIM)", "Sem domínio verificado, só dá para enviar para o próprio e-mail da conta"],
    },
    {
      nome: "Z-API (WhatsApp)", papel: "Atendimento e disparos pelo WhatsApp",
      estado: estado(process.env.ZAPI_INSTANCIA, process.env.ZAPI_TOKEN),
      vars: [
        { chave: "ZAPI_INSTANCIA", ok: !!process.env.ZAPI_INSTANCIA, nota: "id da instância" },
        { chave: "ZAPI_TOKEN", ok: !!process.env.ZAPI_TOKEN, nota: "token da instância" },
        { chave: "ZAPI_CLIENT_TOKEN", ok: !!process.env.ZAPI_CLIENT_TOKEN, nota: "token de segurança da conta" },
      ],
      passos: ["Conectar o número na Z-API", "Apontar o webhook de mensagens para /api/webhooks/zapi"],
    },
  ];

  const rotulo: Record<Estado, string> = { ok: "Conectado", parcial: "Parcial", faltando: "Não configurado" };

  return (
    <Casca atual="/painel/integracoes" titulo="Integrações" subtitulo="Estado das chaves e o que falta em cada serviço" aoVivo={vivos.length}>
      <div className={i.lista}>
        {itens.map((it) => (
          <section key={it.nome} className={`${s.cartao} ${i.card}`}>
            <header className={i.cabecalho}>
              <div>
                <h2 className={i.nome}>{it.nome}</h2>
                <p className={i.papel}>{it.papel}</p>
              </div>
              <span className={`${i.estado} ${i[it.estado]}`}>{rotulo[it.estado]}</span>
            </header>

            <ul className={i.vars}>
              {it.vars.map((v) => (
                <li key={v.chave} className={v.ok ? i.varOk : i.varFalta}>
                  <span className={i.marca} aria-hidden>{v.ok ? "✓" : "○"}</span>
                  <code>{v.chave}</code>
                  <em>{v.nota}</em>
                </li>
              ))}
            </ul>

            {it.estado !== "ok" && (
              <ol className={i.passos}>
                {it.passos.map((p) => <li key={p}>{p}</li>)}
              </ol>
            )}
          </section>
        ))}
      </div>
    </Casca>
  );
}
