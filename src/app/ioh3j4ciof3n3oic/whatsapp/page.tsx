import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import ConexaoZap from "@/components/painel/ConexaoZap";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import MensagensRecuperacao from "@/components/painel/MensagensRecuperacao";
import WhatsAppAbas from "@/components/painel/WhatsAppAbas";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { lerTreinamento } from "@/lib/robo";
import { ler } from "@/lib/config-integracoes";
import { MENSAGEM_CARRINHO_PADRAO, MENSAGEM_PIX_PADRAO, modelosRecuperacao } from "@/lib/mensagens-recuperacao";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";
import w from "@/components/painel/whatsapp.module.css";

export const metadata: Metadata = { title: "WhatsApp", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!painelConfigurado()) redirect("/ioh3j4ciof3n3oic");
  if (!(await autenticado())) redirect("/ioh3j4ciof3n3oic/entrar");

  const [vivos, treinamento, instancia, mensagemPix, mensagemCarrinho, atrasoPix, atrasoCarrinho, botaoPix] = await Promise.all([
    lerAoVivo(), lerTreinamento(), ler("ZAPI_INSTANCIA"),
    ler("WHATSAPP_MSG_PIX_PENDENTE"), ler("WHATSAPP_MSG_CARRINHO_ABANDONADO"),
    ler("WHATSAPP_RECUPERACAO_PIX_MINUTOS"), ler("WHATSAPP_RECUPERACAO_CARRINHO_MINUTOS"),
    ler("WHATSAPP_PIX_BOTAO_COPIAR"),
  ]);

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;


  return (
    <Casca atual="/ioh3j4ciof3n3oic/whatsapp" titulo="WhatsApp"
      subtitulo="Conexão e mensagens automáticas de recuperação"
      aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      <WhatsAppAbas atual="recuperacao" />

      <div className={w.barra}>
        <span className={`${w.estado} ${treinamento.ativo ? w.estadoOn : w.estadoOff}`}>
          Robô {treinamento.ativo ? "ativo" : "desligado"}
        </span>
        <span className={`${w.estado} ${instancia ? w.estadoOn : w.estadoOff}`}>
          Z-API {instancia ? "conectada" : "não configurada"}
        </span>
        <Link href="/ioh3j4ciof3n3oic/whatsapp/treinamento" className={w.btnTreinar}>Treinar o robô</Link>
      </div>

      {!instancia && (
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>Z-API não configurada</p>
          <p>
            Preencha as credenciais em <Link href="/ioh3j4ciof3n3oic/integracoes" style={{ textDecoration: "underline" }}>Integrações</Link>{" "}
            e aponte o webhook de mensagens recebidas para{" "}
            <code>https://cafecomdeusepai.com/api/webhooks/zapi?chave=SEU_SEGREDO_DO_WEBHOOK</code>.
          </p>
        </div>
      )}

      <ConexaoZap />
      <MensagensRecuperacao pix={modelosRecuperacao(mensagemPix, MENSAGEM_PIX_PADRAO)}
        carrinho={modelosRecuperacao(mensagemCarrinho, MENSAGEM_CARRINHO_PADRAO)}
        atrasoPix={Number(atrasoPix) || 0} atrasoCarrinho={Number(atrasoCarrinho) || 0}
        botaoPix={botaoPix !== "0"} />
    </Casca>
  );
}
