import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import FormIntegracao from "@/components/painel/FormIntegracao";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { estadoDasChaves, type ChaveConfig } from "@/lib/config-integracoes";
import { temChaveMestra } from "@/lib/cofre";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import i from "@/components/painel/integracoes.module.css";

export const metadata: Metadata = { title: "Integrações", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NOTAS: Record<ChaveConfig, string> = {
  PINPAY_TOKEN: "Chave secreta sk_live_ ou sk_test_ da PinPay",
  PINPAY_WEBHOOK_SECRET: "Signing Secret whsec_ do endpoint cadastrado",
  RESEND_API_KEY: "Chave re_ da Resend",
  RESEND_REMETENTE: 'Remetente verificado, ex.: "Bela Blue <pedidos@seudominio.com.br>"',
  ZAPI_INSTANCIA: "ID da instância na Z-API",
  ZAPI_TOKEN: "Token da instância",
  ZAPI_CLIENT_TOKEN: "Token de segurança da conta Z-API",
};

const SERVICOS: { nome: string; papel: string; chaves: ChaveConfig[]; passos: string[] }[] = [
  {
    nome: "PinPay", papel: "Cobranças PIX e webhook de pagamento",
    chaves: ["PINPAY_TOKEN", "PINPAY_WEBHOOK_SECRET"],
    passos: ["Cadastrar https://bella-gummy.vercel.app/api/webhooks/pinpay no painel da PinPay", "Marcar o evento payment_approved"],
  },
  {
    nome: "Resend", papel: "E-mails de confirmação de pedido e pagamento",
    chaves: ["RESEND_API_KEY", "RESEND_REMETENTE"],
    passos: ["Verificar o domínio na Resend (SPF + DKIM)", "Sem domínio verificado só dá para enviar ao e-mail da própria conta"],
  },
  {
    nome: "Z-API (WhatsApp)", papel: "Atendimento e disparos pelo WhatsApp",
    chaves: ["ZAPI_INSTANCIA", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN"],
    passos: ["Conectar o número na Z-API", "Apontar o webhook de mensagens para /api/webhooks/zapi"],
  },
];

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [vivos, chaves] = await Promise.all([lerAoVivo(), estadoDasChaves()]);
  const porChave = new Map(chaves.map((c) => [c.chave, c]));

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe).length ?? 0;


  return (
    <Casca atual="/painel/integracoes" titulo="Integrações" subtitulo="Edite as credenciais direto por aqui" aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      {!temChaveMestra() && (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Edição bloqueada</p>
          <p>
            Defina <code>CHAVE_MESTRA</code> (mínimo 32 caracteres) no ambiente. Ela cifra os
            segredos antes de irem para o banco — sem ela, guardar credencial ali seria deixá-la
            em texto puro. É a única que precisa continuar em variável de ambiente.
          </p>
        </div>
      )}

      <div className={i.lista}>
        {SERVICOS.map((serv) => {
          const estados = serv.chaves.map((c) => porChave.get(c)!).filter(Boolean);
          const preenchidas = estados.filter((e) => e.preenchida).length;
          const estado = preenchidas === 0 ? "faltando" : preenchidas === estados.length ? "ok" : "parcial";
          const rotulo = { ok: "Conectado", parcial: "Parcial", faltando: "Não configurado" }[estado];

          return (
            <section key={serv.nome} className={`${s.cartao} ${i.card}`}>
              <header className={i.cabecalho}>
                <div>
                  <h2 className={i.nome}>{serv.nome}</h2>
                  <p className={i.papel}>{serv.papel}</p>
                </div>
                <span className={`${i.estado} ${i[estado]}`}>{rotulo}</span>
              </header>

              <div className={i.campos}>
                {estados.map((e) => (
                  <FormIntegracao key={e.chave} estado={e} nota={NOTAS[e.chave]} />
                ))}
              </div>

              {estado !== "ok" && (
                <ol className={i.passos}>{serv.passos.map((p) => <li key={p}>{p}</li>)}</ol>
              )}
            </section>
          );
        })}
      </div>
    </Casca>
  );
}
