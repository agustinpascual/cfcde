"use client";

/* Botão de imprimir. Só existe como client component porque window.print()
   não roda no servidor — a página do recibo em si continua sendo servidor. */
export default function Imprimir({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </button>
  );
}
