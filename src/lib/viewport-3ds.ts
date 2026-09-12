/** Mantém somente medidas da área visível; não acessa o iframe do banco. */
export function acompanharViewport3ds() {
  const raiz = document.documentElement;
  const viewport = window.visualViewport;
  const propriedades = ["--cdp-3ds-vw", "--cdp-3ds-vh", "--cdp-3ds-top", "--cdp-3ds-left"];
  const anteriores = propriedades.map(nome => raiz.style.getPropertyValue(nome));
  let frame = 0;

  function medir() {
    frame = 0;
    const medidas = [
      viewport?.width ?? window.innerWidth,
      viewport?.height ?? window.innerHeight,
      viewport?.offsetTop ?? 0,
      viewport?.offsetLeft ?? 0,
    ];
    propriedades.forEach((nome, i) => raiz.style.setProperty(nome, `${medidas[i]}px`));
  }

  function agendar() {
    if (!frame) frame = window.requestAnimationFrame(medir);
  }

  medir();
  window.addEventListener("resize", agendar);
  viewport?.addEventListener("resize", agendar);
  viewport?.addEventListener("scroll", agendar);

  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", agendar);
    viewport?.removeEventListener("resize", agendar);
    viewport?.removeEventListener("scroll", agendar);
    propriedades.forEach((nome, i) => {
      if (anteriores[i]) raiz.style.setProperty(nome, anteriores[i]);
      else raiz.style.removeProperty(nome);
    });
  };
}
