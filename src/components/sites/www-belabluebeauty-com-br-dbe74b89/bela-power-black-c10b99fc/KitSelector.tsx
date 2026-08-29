"use client";
import Image from "next/image";
import { kits } from "./data";
import { ClockIcon } from "./icons";
import s from "./styles.module.css";

/* .bb-kit-card — o card ativo recebe a faixa "OPÇÃO SELECIONADA" via ::before
   (bg #12336e, 10px/800, h23, absolute top/left/right 0) */
export default function KitSelector({ sel, onSelect }: { sel: number; onSelect: (i: number) => void }) {

  return (
    <div className={s.kits}>
      <p className={s.kitTitulo}>Escolha o seu KIT IDEAL para o seu tratamento</p>

      <div className={s.kitLista} role="radiogroup" aria-label="Escolha o seu kit">
        {kits.map((k, i) => {
          const ativo = i === sel;
          return (
            <button
              key={k.nome}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onSelect(i)}
              className={`${s.kitCard} ${ativo ? s.kitCardAtivo : ""} ${k.recomendado ? s.kitCardRecomendado : ""}`}
            >
              {ativo ? (
                <span className={s.kitFaixa}>OPÇÃO SELECIONADA</span>
              ) : k.recomendado ? (
                <span className={`${s.kitFaixa} ${s.kitFaixaRecomendado}`}>★ MAIS VENDIDO · RECOMENDADO</span>
              ) : null}

              <span className={s.kitImagem}>
                <Image src={k.imagem} alt={k.nome} width={133} height={140} sizes="133px" loading="lazy" />
                {k.desconto && <span className={s.kitDesconto}>{k.desconto}</span>}
              </span>

              <span className={s.kitInfo}>
                <span className={s.kitNome}>{k.nome}</span>
                <span className={s.kitDuracao}><ClockIcon style={{ flex: "0 0 14px" }} />{k.duracao}</span>
                <span className={s.kitDescricao}>{k.descricao}</span>
                <span className={s.kitDe}>{k.de ? <>De: <s>{k.de}</s></> : ""}</span>
                <span className={s.kitTotal}>Total<strong>{k.total}</strong></span>
                <span className={s.kitUnitario}>A UNIDADE FICA:<strong>{k.unidade}</strong></span>
                {k.economia && <span className={s.kitEconomia}>{k.economia}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
