import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Casca from "@/components/painel/Casca";
import FaixaInstalar from "@/components/painel/FaixaInstalar";
import FormTreinamento from "@/components/painel/FormTreinamento";
import { estadoInstalacao, lerAoVivo } from "@/components/painel/dados";
import { lerTreinamento } from "@/lib/robo";
import { intencoesEmbutidas } from "@/lib/robo-interno";
import { autenticado, painelConfigurado } from "@/lib/painel-auth";
import s from "@/components/painel/painel.module.css";

export const metadata: Metadata = { title: "Treinamento do robô", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ROTULOS: Record<string, string> = {
  preco: "Preço, kits e desconto",
  frete: "Frete e prazo de entrega",
  pagamento: "Formas de pagamento",
  como_tomar: "Como tomar",
  o_que_e: "O que é o produto",
  rastreio: "Onde está meu pedido",
  saude: "Saúde, gravidez, remédio",
  troca: "Troca, devolução, cancelamento",
  reclamacao: "Reclamação",
  saudacao: "Saudação",
};

export default async function Page() {
  if (!painelConfigurado()) redirect("/painel");
  if (!(await autenticado())) redirect("/painel/entrar");

  const [vivos, treinamento] = await Promise.all([lerAoVivo(), lerTreinamento()]);
  const semChave = !process.env.ANTHROPIC_API_KEY;

  const _inst = await estadoInstalacao();

  const _faltam = _inst?.filter((t) => !t.existe || t.colunasFaltando.length).length ?? 0;


  return (
    <Casca atual="/painel/whatsapp" titulo="Treinamento do robô"
      subtitulo="Define como ele responde no WhatsApp" aoVivo={vivos.length}>
      <FaixaInstalar faltam={_faltam} />
      <p style={{ marginBottom: 18 }}>
        <Link href="/painel/whatsapp" style={{ fontSize: 13, color: "#2f5fd0", textDecoration: "underline" }}>
          ← Voltar para as conversas
        </Link>
      </p>

      <div className={s.avisoOk}>
        <p className={s.avisoTitulo}>
          {semChave ? "Rodando no motor interno" : "Motor interno + Claude"}
        </p>
        <p>
          {semChave
            ? "Sem chave da Anthropic o robô continua respondendo: ele casa a pergunta com o treinamento abaixo e com as intenções já embutidas. Ele nunca inventa — quando não reconhece, manda a mensagem de encaminhamento."
            : "O motor interno resolve na hora os assuntos sensíveis (saúde, troca, reclamação) e o Claude cuida do resto. Se a API falhar, o motor interno assume sozinho."}
        </p>
      </div>

      <section className={s.intencoes}>
        <h2 className={s.intencoesTitulo}>Já respondidas sem você escrever nada</h2>
        <p className={s.intencoesNota}>
          Preço e frete saem direto dos dados da loja, então nunca ficam desatualizados.
          Para qualquer coisa fora desta lista ele usa a mensagem de encaminhamento.
        </p>
        <ul>
          {intencoesEmbutidas().map((i) => (
            <li key={i.id}>
              <span className={i.escalar ? s.tagEscala : s.tagResponde}>
                {i.escalar ? "encaminha" : "responde"}
              </span>
              <strong>{ROTULOS[i.id] ?? i.id}</strong>
              <span className={s.intencoesGatilhos}>{i.gatilhos.join(" · ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <FormTreinamento inicial={treinamento} />
    </Casca>
  );
}
