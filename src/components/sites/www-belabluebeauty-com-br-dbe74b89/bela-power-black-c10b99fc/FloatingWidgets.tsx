import Image from "next/image";
import { whatsapp } from "./data";
import s from "./styles.module.css";

/* Botão do WhatsApp fixo no canto inferior direito (substitui o assistente virtual
   que ocupava essa posição no site original). */
export default function FloatingWidgets() {
  return (
    <a
      className={s.whatsapp}
      href={whatsapp.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
    >
      <Image src={whatsapp.img} alt="" width={62} height={62} sizes="62px" />
      <span className={s.whatsappPulso} aria-hidden />
    </a>
  );
}
