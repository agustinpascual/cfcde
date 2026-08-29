import Image from "next/image";
import { alerts } from "./data";
import s from "./styles.module.css";

export default function AlertsStrip() {
  return (
    <div className={s.alerts}>
      <div className={s.alertsWrapper}>
        {alerts.map((a) => (
          <p key={a.forte} className={s.alertItem}>
            <Image src={a.img} alt="" width={32} height={32} sizes="32px" loading="lazy" />
            <span>{a.texto}<b>{a.forte}</b></span>
          </p>
        ))}
      </div>
    </div>
  );
}
