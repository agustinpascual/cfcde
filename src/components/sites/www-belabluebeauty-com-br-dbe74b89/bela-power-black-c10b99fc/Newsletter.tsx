"use client";
import { MailIcon } from "./icons";
import s from "./styles.module.css";

export default function Newsletter() {
  return (
    <div className={s.newsletter}>
      <div className={s.newsContent}>
        <div className={s.newsText}>
          <MailIcon className={s.newsIcon} />
          <div>
            <strong className={s.newsTitle}>OBTENHA DESCONTOS EXCLUSIVOS</strong>
            <span className={s.newsSub}>JUNTE-SE A NÓS</span>
          </div>
        </div>

        <form className={s.newsForm} onSubmit={(e) => e.preventDefault()}>
          <input className={s.newsInput} type="text" placeholder="Seu nome" aria-label="Seu nome" />
          <input className={s.newsInput} type="email" placeholder="Seu e-mail" aria-label="Seu e-mail" />
          <button className={s.newsBtn} type="submit">Cadastre-se</button>
        </form>
      </div>
    </div>
  );
}
