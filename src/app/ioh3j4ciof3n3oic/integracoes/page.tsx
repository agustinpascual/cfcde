import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3, Building2, CreditCard, Mail, MessageCircle, Target, Truck,
  type LucideIcon,
} from "lucide-react";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import FormIntegracao from "@/components/painel/FormIntegracao";
import GatewaysPagamento from "@/components/painel/GatewaysPagamento";
import GoogleTagsForm from "@/components/painel/GoogleTagsForm";
import MetaPixelsForm from "@/components/painel/MetaPixelsForm";
import { lerGateways } from "@/lib/gateways-config";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { estadoDasChaves, type ChaveConfig } from "@/lib/config-integracoes";
import { lerTagsGoogle, pixelsMetaParaPainel } from "@/lib/marketing-config";
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
  ZAPI_WEBHOOK_SECRET: "Segredo exclusivo que protege a URL de recebimento — use pelo menos 32 caracteres aleatórios",
  WHATSAPP_MSG_PIX_PENDENTE: "Modelo de recuperação de Pix, editado na aba WhatsApp",
  WHATSAPP_MSG_CARRINHO_ABANDONADO: "Modelo de recuperação de carrinho, editado na aba WhatsApp",
  WHATSAPP_RECUPERACAO_PIX_MINUTOS: "Tempo da recuperação automática de Pix, editado na aba WhatsApp",
  WHATSAPP_RECUPERACAO_CARRINHO_MINUTOS: "Tempo da recuperação automática de carrinho, editado na aba WhatsApp",
  WHATSAPP_PIX_BOTAO_COPIAR: "Botão para copiar o código Pix na recuperação, editado na aba WhatsApp",
  GEMINI_API_KEY: "Chave do Google AI Studio — dá ao robô compreensão de linguagem",
  BBF_PROVISIONAMENTO_URL: "URL do endpoint que cria a conta no app (app-bella-two)",
  BBF_PROVISIONAMENTO_TOKEN: "Token x-bbf-token que autoriza a criação de acesso",
  EMPRESA_RAZAO_SOCIAL: "Razão social completa, como no cartão CNPJ",
  EMPRESA_CNPJ: "Apenas números ou com pontuação — sai impresso no recibo",
  EMPRESA_IE: "Inscrição estadual (deixe vazio se for isento)",
  EMPRESA_ENDERECO: "Endereço completo em uma linha: rua, nº, bairro, cidade/UF, CEP",
  EMPRESA_TELEFONE: "Telefone de contato que aparece no recibo",
  META_CAPI_TOKEN: "Token da API de Conversões (Eventos > Configurar > API de Conversões)",
  META_PIXELS: "IDs e tokens dos pixels da Meta, armazenados juntos e cifrados",
  GOOGLE_TAG_ID: "ID da tag do Google, ex.: G-…, GT-…, AW-… ou GTM-…",
  GOOGLE_TAGS: "Lista de tags do Google Analytics, Ads e Tag Manager",
  CORREIOS_URL: "Endpoint que cria a encomenda, ex.: https://….supabase.co/functions/v1/pedido-pago",
  CORREIOS_SECRET: "Valor do cabeçalho x-integration-secret — nunca sai do servidor",
  EMPRESA_LOGO: "Caminho do logo, ex.: /sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png",
};

type Servico = {
  nome: string;
  papel: string;
  chaves: ChaveConfig[];
  passos: string[];
  icone: LucideIcon;
};

const SERVICOS: Servico[] = [
  {
    nome: "AxxonPay", papel: "PIX e cartão tokenizado pelo SDK oficial",
    icone: CreditCard,
    chaves: ["AXXONPAY_PUBLIC_KEY", "AXXONPAY_SECRET_KEY"],
    passos: ["Obtenha Public Key e Secret Key na área de integrações da AxxonPay, não a senha de login.",
      "Configure o webhook normalizado para https://cafecomdeusepai.com/api/webhooks/axxonpay.",
      "Salve as chaves e selecione o gateway acima. Antes de cobrar clientes, homologue PIX, cartão e 3DS com a AxxonPay."],
  },
  {
    nome: "PinPay", papel: "Cobranças PIX e webhook de pagamento",
    icone: CreditCard,
    chaves: ["PINPAY_TOKEN", "PINPAY_WEBHOOK_SECRET"],
    passos: ["Cadastrar https://cafecomdeusepai.com/api/webhooks/pinpay no painel da PinPay", "Marcar o evento payment_approved"],
  },
  {
    nome: "Resend", papel: "E-mails de confirmação de pedido e pagamento",
    icone: Mail,
    chaves: ["RESEND_API_KEY", "RESEND_REMETENTE"],
    passos: ["Verificar o domínio na Resend (SPF + DKIM)", "Sem domínio verificado só dá para enviar ao e-mail da própria conta"],
  },
  {
    nome: "Meta Pixel", papel: "Rastreia visitas, início de checkout e compras",
    icone: Target,
    chaves: ["META_PIXELS"],
    passos: [
      "Informe o ID e o token da API de Conversões de cada pixel",
      "PageView e InitiateCheckout saem do navegador; Purchase sai do servidor quando o PIX é confirmado",
      "Purchase pelo servidor é o único jeito de contar PIX: o cliente fecha a aba antes de o pagamento cair",
    ],
  },
  {
    nome: "Google Tag", papel: "Google Analytics, Google Ads ou Google Tag Manager",
    icone: BarChart3,
    chaves: ["GOOGLE_TAGS"],
    passos: [
      "Cole o identificador completo fornecido pelo Google (G-, GT-, AW- ou GTM-)",
      "PageView, produto, carrinho, checkout e pagamento são enviados automaticamente",
      "A tag não é carregada dentro do painel administrativo",
    ],
  },
  {
    nome: "Correios", papel: "Cria a encomenda e devolve o código de rastreio",
    icone: Truck,
    chaves: ["CORREIOS_URL", "CORREIOS_SECRET"],
    passos: [
      "A chamada sai do servidor da loja, nunca do navegador — o segredo não pode ir para o JavaScript da página",
      "Dispara sozinho quando a PinPay confirma o pagamento; o código vai no e-mail de confirmação",
      "Sem estas duas chaves o pedido segue normal, só sem rastreio automático",
    ],
  },
  {
    nome: "Dados da empresa", papel: "Saem impressos no recibo de compra do cliente",
    icone: Building2,
    chaves: ["EMPRESA_RAZAO_SOCIAL", "EMPRESA_CNPJ", "EMPRESA_IE", "EMPRESA_ENDERECO", "EMPRESA_TELEFONE", "EMPRESA_LOGO"],
    passos: [
      "O recibo abre em cada pedido, no botão \u201cRecibo\u201d",
      "Recibo não é nota fiscal: a NF-e exige certificado digital e autorização da SEFAZ",
    ],
  },
  {
    nome: "Z-API (WhatsApp)", papel: "Atendimento e disparos pelo WhatsApp",
    icone: MessageCircle,
    chaves: ["ZAPI_INSTANCIA", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN", "ZAPI_WEBHOOK_SECRET"],
    passos: [
      "Conectar o número na Z-API e ativar o Client-Token na área Segurança",
      "Cadastrar o webhook Ao receber como https://cafecomdeusepai.com/api/webhooks/zapi?chave=SEU_SEGREDO_DO_WEBHOOK",
      "O segredo do webhook deve ser diferente do token da instância e do Client-Token",
    ],
  },
];

const GRUPOS = [
  {
    titulo: "Pagamentos",
    descricao: "Credenciais usadas para criar cobranças e receber confirmações.",
    servicos: ["AxxonPay", "PinPay"],
  },
  {
    titulo: "Comunicação e marketing",
    descricao: "Canais de relacionamento, mensagens e acompanhamento de conversões.",
    servicos: ["Resend", "Meta Pixel", "Google Tag", "Z-API (WhatsApp)"],
  },
  {
    titulo: "Operação da loja",
    descricao: "Dados fiscais do recibo, postagem e rastreamento dos pedidos.",
    servicos: ["Correios", "Dados da empresa"],
  },
] as const;

export default async function Page() {
  if (!painelConfigurado()) redirect("/ioh3j4ciof3n3oic");
  if (!(await autenticado())) redirect("/ioh3j4ciof3n3oic/entrar");

  const [vivos, chaves, pixelsMeta, tagsGoogle] = await Promise.all([
    lerAoVivo(), estadoDasChaves(), pixelsMetaParaPainel(), lerTagsGoogle(),
  ]);
  const porChave = new Map(chaves.map((c) => [c.chave, c]));

  const estadoServico = (serv: Servico) => {
    if (serv.nome === "Meta Pixel") {
      const preenchidas = pixelsMeta.filter((pixel) => pixel.tokenPreenchido).length;
      const estado = pixelsMeta.length === 0 ? "faltando" : preenchidas === pixelsMeta.length ? "ok" : "parcial";
      return { estados: [], estado } as const;
    }
    if (serv.nome === "Google Tag") {
      return { estados: [], estado: tagsGoogle.length ? "ok" : "faltando" } as const;
    }
    const estados = serv.chaves.map((c) => porChave.get(c)!).filter(Boolean);
    const preenchidas = estados.filter((e) => e.preenchida).length;
    const estado = preenchidas === 0 ? "faltando" : preenchidas === estados.length ? "ok" : "parcial";
    return { estados, estado } as const;
  };
  const totais = SERVICOS.reduce((acc, serv) => {
    const { estado } = estadoServico(serv);
    acc[estado] += 1;
    return acc;
  }, { ok: 0, parcial: 0, faltando: 0 });

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;


  return (
    <Casca atual="/ioh3j4ciof3n3oic/integracoes" titulo="Integrações" subtitulo="Edite as credenciais direto por aqui" aoVivo={vivos.length}>
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

      <section className={i.visaoGeral} aria-label="Resumo das integrações">
        <div className={i.visaoTexto}>
          <span className={i.sobretitulo}>Central de conexões</span>
          <h2>Serviços conectados à loja</h2>
          <p>Configure pagamentos, comunicação e operação em um só lugar.</p>
        </div>
        <div className={i.resumoEstados}>
          <div><strong>{totais.ok}</strong><span>Conectados</span></div>
          <div><strong>{totais.parcial}</strong><span>Parciais</span></div>
          <div><strong>{totais.faltando}</strong><span>Pendentes</span></div>
        </div>
      </section>

      <div className={i.gatewayDestaque}>
        <GatewaysPagamento inicial={await lerGateways()} editavel={temChaveMestra()} />
      </div>

      <div className={i.grupos}>
        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo} className={i.grupo}>
            <header className={i.grupoCabecalho}>
              <div>
                <h2>{grupo.titulo}</h2>
                <p>{grupo.descricao}</p>
              </div>
              <span>{grupo.servicos.length} serviços</span>
            </header>

            <div className={i.grade}>
              {SERVICOS.filter((serv) => grupo.servicos.some((nome) => nome === serv.nome)).map((serv) => {
                const { estados, estado } = estadoServico(serv);
                const rotulo = { ok: "Conectado", parcial: "Parcial", faltando: "Não configurado" }[estado];
                const Icone = serv.icone;

                return (
                  <article key={serv.nome} className={`${s.cartao} ${i.card} ${i[`card${estado}`]}`}>
                    <header className={i.cabecalho}>
                      <div className={i.identidade}>
                        <span className={i.icone} aria-hidden="true"><Icone size={19} strokeWidth={1.8} /></span>
                        <div>
                          <h3 className={i.nome}>{serv.nome}</h3>
                          <p className={i.papel}>{serv.papel}</p>
                        </div>
                      </div>
                      <span className={`${i.estado} ${i[estado]}`}>{rotulo}</span>
                    </header>

                    {serv.nome === "Meta Pixel" ? (
                      <MetaPixelsForm inicial={pixelsMeta} editavel={temChaveMestra()} />
                    ) : serv.nome === "Google Tag" ? (
                      <GoogleTagsForm inicial={tagsGoogle} editavel={temChaveMestra()} />
                    ) : (
                      <div className={i.campos}>
                          {estados.map((e) => (
                            <FormIntegracao key={e.chave} estado={e} nota={NOTAS[e.chave]} />
                          ))}
                      </div>
                    )}

                    {estado !== "ok" && (
                      <div className={i.configAjuda}>
                        <p>Como configurar</p>
                        <ol className={i.passos}>{serv.passos.map((p) => <li key={p}>{p}</li>)}</ol>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Casca>
  );
}
