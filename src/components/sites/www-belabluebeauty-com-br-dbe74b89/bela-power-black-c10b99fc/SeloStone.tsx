import Image from "next/image";
import { IMG } from "./data";
import s from "./selo-stone.module.css";

/* Selo do processador. Aparece onde a pessoa decide pagar — é o momento em
   que ela quer saber para quem o dinheiro está indo. */
export default function SeloStone({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={`${s.selo} ${compacto ? s.compacto : ""}`}>
      <span className={s.acima}>Pix processado por</span>
      <Image
        src={`${IMG}/stone.png`}
        alt="Stone"
        width={440}
        height={117}
        className={s.logo}
        sizes={compacto ? "72px" : "92px"}
      />
      <span className={s.abaixo}>Antiga Pagar.me</span>
    </div>
  );
}
