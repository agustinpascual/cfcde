/* Caixa que marca onde entra uma imagem real.
   Some assim que você trocar por <Image />. */
export function Placeholder({
  ratio = "4 / 3",
  rotulo,
  className = "",
}: {
  ratio?: string;
  rotulo?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-[var(--sf-surface-2)] ${className}`}
      style={{
        aspectRatio: ratio,
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent 0 10px, rgba(0,0,0,.022) 10px 20px)",
      }}
    >
      {rotulo ? (
        <span className="px-3 text-center text-[10px] font-medium uppercase tracking-[.16em] text-[var(--sf-muted)]">
          {rotulo}
        </span>
      ) : null}
    </div>
  );
}
