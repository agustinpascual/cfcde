import Image from "next/image";
import styles from "./LoadingScreen.module.css";

const LOGO = "/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/logo.png";

/* Tela branca com a logo pulsando dentro de um anel girando. Serve tanto
   para o loading.tsx das rotas quanto para o splash da primeira visita. */
export default function LoadingScreen({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      className={`${styles.screen} ${hidden ? styles.hidden : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={hidden || undefined}
    >
      <div className={styles.brand}>
        <span className={styles.ring} aria-hidden="true" />
        <Image className={styles.logo} src={LOGO} alt="" width={663} height={746} priority />
      </div>
      <span className={styles.srOnly}>Carregando…</span>
    </div>
  );
}
