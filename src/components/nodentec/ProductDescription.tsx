"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Radio, ShieldCheck, SlidersHorizontal } from "lucide-react";
import productImage from "@/lib/1-frontal (1).jpg";

const FEATURES = [
  {
    icon: Radio,
    title: "Três opções de alcance",
    text: "Escolha entre os modelos de 15, 25 ou 50 metros conforme as dimensões e as características do ambiente.",
  },
  {
    icon: SlidersHorizontal,
    title: "Operação prática",
    text: "Controles objetivos e formato compacto para facilitar o posicionamento, a configuração e o uso diário.",
  },
  {
    icon: ShieldCheck,
    title: "Construção funcional",
    text: "Base estável, estrutura resistente e acabamento discreto para integração em diferentes espaços internos.",
  },
];

const ACCORDION = [
  {
    title: "Como funciona",
    text: "O equipamento foi desenvolvido para atuar sobre a comunicação Bluetooth dentro de uma área delimitada, reduzindo a estabilidade da conexão entre dispositivos compatíveis no alcance selecionado. O desempenho pode variar conforme paredes, obstáculos, interferências externas, posição do aparelho e características do ambiente.",
  },
  {
    title: "Como escolher o modelo ideal",
    text: "O modelo de 15 metros é indicado para áreas menores e uso localizado. O modelo de 25 metros amplia a cobertura para ambientes médios e acompanha carregador. Para espaços maiores, o modelo de 50 metros oferece o maior alcance da linha e acompanha carregador e estojo. Antes da compra, considere a distância entre o equipamento e os dispositivos, além da quantidade de paredes e barreiras físicas.",
  },
  {
    title: "Conteúdo da embalagem",
    text: "Modelo de 15 metros: 1 aparelho. Modelo de 25 metros: 1 aparelho e 1 carregador. Modelo de 50 metros: 1 aparelho, 1 carregador e 1 estojo. Confira o modelo selecionado no carrinho antes de finalizar o pedido.",
  },
  {
    title: "Instalação e utilização",
    text: "Posicione o aparelho sobre uma superfície plana, seca e ventilada, preferencialmente em uma região central da área pretendida. Mantenha distância de fontes de calor, umidade e objetos que possam bloquear o sinal. Conecte ou carregue o equipamento conforme os acessórios fornecidos e siga as orientações do manual antes de iniciar a operação.",
  },
  {
    title: "Cuidados e conservação",
    text: "Utilize apenas acessórios compatíveis, não cubra o aparelho durante o funcionamento e evite quedas, líquidos ou exposição direta ao sol. Para limpeza, desligue o equipamento e use um pano macio e seco. Não abra, perfure ou tente reparar o produto sem assistência especializada.",
  },
  {
    title: "Observações sobre alcance",
    text: "As distâncias de 15, 25 e 50 metros são referências nominais. O alcance efetivo não é garantido de forma idêntica em todos os locais, pois estruturas de concreto, divisórias, móveis, outros equipamentos eletrônicos e a disposição do ambiente podem reduzir a área de atuação.",
  },
];

export function ProductDescription() {
  const [open, setOpen] = useState<number[]>([0, 1]);
  const toggle = (index: number) =>
    setOpen((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );

  return (
    <section className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-[var(--bb-border)] bg-white shadow-sm">
        <div className="grid items-center bg-gradient-to-br from-[#0f0f0f] via-[var(--bb-black)] to-[var(--bb-black-soft)] md:grid-cols-2">
          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <span className="inline-block rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold tracking-widest text-white/80 uppercase">
              Tecnologia e controle
            </span>
            <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Amplificador para bloqueio de sinal <span className="text-[var(--bb-orange)]">Bluetooth</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70">
              Solução compacta desenvolvida para controle localizado de comunicação Bluetooth, disponível em três configurações de alcance para diferentes tamanhos de ambiente.
            </p>
          </div>
          <div className="relative min-h-[320px] bg-white/5 sm:min-h-[400px]">
            <Image src={productImage} alt="Amplificador para bloqueio de sinal Bluetooth" fill className="object-contain p-6" />
          </div>
        </div>

        <div className="px-6 py-10 sm:px-10">
          <span className="inline-block rounded-full bg-[var(--bb-orange-light)] px-3 py-1 text-[11px] font-bold tracking-wide text-[var(--bb-orange-dark)] uppercase">
            Controle sob medida
          </span>
          <h3 className="mt-3 max-w-[760px] font-heading text-2xl font-bold text-[var(--bb-black)] sm:text-[30px]">
            Escolha a cobertura adequada para o seu espaço
          </h3>
          <p className="mt-4 max-w-[800px] text-[15px] leading-7 text-[var(--bb-text-2)]">
            Com opções de alcance nominal de <strong>15, 25 e 50 metros</strong>, o equipamento permite selecionar a configuração mais compatível com a área pretendida. Seu corpo compacto facilita o posicionamento, enquanto a base foi projetada para manter o aparelho firme durante a utilização. É uma alternativa prática para aplicações controladas que exigem gerenciamento localizado de conexões Bluetooth.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-[var(--bb-border)] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-black)] text-white">
                  <feature.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-heading text-sm font-bold text-[var(--bb-black)]">{feature.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--bb-muted)]">{feature.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid overflow-hidden rounded-2xl border border-[var(--bb-border)] sm:grid-cols-3">
            {[
              ["15 metros", "Uso localizado", "Aparelho"],
              ["25 metros", "Ambientes médios", "Aparelho + carregador"],
              ["50 metros", "Maior cobertura", "Aparelho + carregador + estojo"],
            ].map(([range, use, contents], index) => (
              <div key={range} className={`p-5 ${index > 0 ? "border-t border-[var(--bb-border)] sm:border-t-0 sm:border-l" : ""}`}>
                <p className="font-heading text-lg font-extrabold text-[var(--bb-black)]">{range}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--bb-orange-dark)]">{use}</p>
                <p className="mt-3 text-xs leading-relaxed text-[var(--bb-muted)]">Inclui: {contents}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 divide-y divide-[var(--bb-border)] border-t border-b border-[var(--bb-border)]">
            {ACCORDION.map((item, index) => (
              <div key={item.title}>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  aria-expanded={open.includes(index)}
                >
                  <span className="flex items-center gap-2 font-heading text-[15px] font-bold text-[var(--bb-black)]">
                    <span className="h-3.5 w-1 rounded-full bg-[var(--bb-orange)]" />
                    {item.title}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--bb-muted)] transition-transform ${open.includes(index) ? "rotate-180" : ""}`}
                  />
                </button>
                {open.includes(index) && (
                  <p className="pb-5 pl-3.5 text-[14px] leading-6 text-[var(--bb-text-2)]">{item.text}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-[var(--bb-black)] p-5">
            <p className="text-[13px] font-bold text-white">Uso responsável e conformidade</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">
              Equipamentos que interferem em comunicações sem fio podem estar sujeitos a restrições legais e regulatórias. Antes de ligar ou instalar o produto, confirme as regras aplicáveis à sua localidade e utilize-o somente em ambientes, dispositivos e situações para os quais você possua autorização. Não utilize próximo a serviços de emergência, equipamentos médicos, sistemas de segurança ou comunicações essenciais.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
