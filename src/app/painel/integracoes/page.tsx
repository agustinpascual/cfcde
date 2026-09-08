import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import FormIntegracao from "@/components/painel/FormIntegracao";
import GatewaysPagamento from "@/components/painel/GatewaysPagamento";
import { lerGateways } from "@/lib/gateways-config";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { estadoDasChaves, type ChaveConfig } from "@/lib/config-integracoes";
import { temChaveMestra } from "@/lib/cofre";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import i from "@/components/painel/integracoes.module.css";

export const metadata: Metadata = { title: "Integrações", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NOTAS: Record<ChaveConfig, string> = {
  AXXONPAY_PUBLIC_KEY: "Public Key pk_ da integração AxxonPay",
  AXXONPAY_SECRET_KEY: "Secret Key sk_ da integração AxxonPay — somente no servidor",
  PAGAMENTOS_GATEWAYS: "Seleção de gateways, gerenciada pelo formulário acima",
  PINPAY_TOKEN: "Chave secreta sk_live_ ou sk_test_ da PinPay",
  PINPAY_WEBHOOK_SECRET: "Signing Secret whsec_ do endpoint cadastrado",
  RESEND_API_KEY: "Chave re_ da Resend",
  RESEND_REMETENTE: 'Remetente verificado, ex.: "Café com Deus Pai <pedidos@seudominio.com.br>"',
  ZAPI_INSTANCIA: "ID da instância na Z-API",
  ZAPI_TOKEN: "Token da instância",
  ZAPI_CLIENT_TOKEN: "Token de segurança da conta Z-API",
  GEMINI_API_KEY: "Chave do Google AI Studio — dá ao robô compreensão de linguagem",
  BBF_PROVISIONAMENTO_URL: "URL do endpoint que cria a conta no app (app-bella-two)",
  BBF_PROVISIONAMENTO_TOKEN: "Token x-bbf-token que autoriza a criação de acesso",
  EMPRESA_RAZAO_SOCIAL: "Razão social completa, como no cartão CNPJ",
  EMPRESA_CNPJ: "Apenas números ou com pontuação — sai impresso no recibo",
  EMPRESA_IE: "Inscrição estadual (deixe vazio se for isento)",
  EMPRESA_ENDERECO: "Endereço completo em uma linha: rua, nº, bairro, cidade/UF, CEP",
  EMPRESA_TELEFONE: "Telefone de contato que aparece no recibo",
  META_CAPI_TOKEN: "Token da API de Conversões (Eventos > Configurar > API de Conversões)",
  CORREIOS_URL: "Endpoint que cria a encomenda, ex.: https://….supabase.co/functions/v1/pedido-pago",
  CORREIOS_SECRET: "Valor do cabeçalho x-integration-secret — nunca sai do servidor",
  EMPRESA_LOGO: "Caminho do logo, ex.: /sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png",
};

const SERVICOS: { nome: string; papel: string; chaves: ChaveConfig[]; passos: string[] }[] = [
  {
    nome: "AxxonPay", papel: "PIX e cartão tokenizado pelo SDK oficial",
    chaves: ["AXXONPAY_PUBLIC_KEY", "AXXONPAY_SECRET_KEY"],
    passos: ["Obtenha Public Key e Secret Key na área de integrações da AxxonPay, não a senha de login.",
      "Configure o webhook normalizado para https://cafecomdeusepai.com/api/webhooks/axxonpay.",
      "Salve as chaves e selecione o gateway acima. Antes de cobrar clientes, homologue PIX, cartão e 3DS com a AxxonPay."],
  },
  {
    nome: "PinPay", papel: "Cobranças PIX e webhook de pagamento",
    chaves: ["PINPAY_TOKEN", "PINPAY_WEBHOOK_SECRET"],
    passos: ["Cadastrar https://cafecomdeusepai.com/api/webhooks/pinpay no painel da PinPay", "Marcar o evento payment_approved"],
  },
  {
    nome: "Resend", papel: "E-mails de confirmação de pedido e pagamento",
    chaves: ["RESEND_API_KEY", "RESEND_REMETENTE"],
    passos: ["Verificar o domínio na Resend (SPF + DKIM)", "Sem domínio verificado só dá para enviar ao e-mail da própria conta"],
  },
  {
    nome: "Meta Pixel", papel: "Rastreia visitas, início de checkout e compras",
    chaves: ["META_CAPI_TOKEN"],
    passos: [
      "O ID do pixel fica no build (NEXT_PUBLIC_META_PIXEL_ID); só o token é editável aqui",
      "PageView e InitiateCheckout saem do navegador; Purchase sai do servidor quando o PIX é confirmado",
      "Purchase pelo servidor é o único jeito de contar PIX: o cliente fecha a aba antes de o pagamento cair",
    ],
  },
  {
    nome: "Correios", papel: "Cria a encomenda e devolve o código de rastreio",
    chaves: ["CORREIOS_URL", "CORREIOS_SECRET"],
    passos: [
      "A chamada sai do servidor da loja, nunca do navegador — o segredo não pode ir para o JavaScript da página",
      "Dispara sozinho quando a PinPay confirma o pagamento; o código vai no e-mail de confirmação",
      "Sem estas duas chaves o pedido segue normal, só sem rastreio automático",
    ],
  },
  {
    nome: "Dados da empresa", papel: "Saem impressos no recibo de compra do cliente",
    chaves: ["EMPRESA_RAZAO_SOCIAL", "EMPRESA_CNPJ", "EMPRESA_IE", "EMPRESA_ENDERECO", "EMPRESA_TELEFONE", "EMPRESA_LOGO"],
    passos: [
      "O recibo abre em cada pedido, no botão \u201cRecibo\u201d",
      "Recibo não é nota fiscal: a NF-e exige certificado digital e autorização da SEFAZ",
    ],
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

  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;


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
        <GatewaysPagamento inicial={await lerGateways()} editavel={temChaveMestra()} />
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
