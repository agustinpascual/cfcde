"use client";

import { useEffect, useState } from "react";

function useCountdown(hours: number) {
  const durationMs = hours * 60 * 60 * 1000;
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    const target = Date.now() + durationMs;
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hrs = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return { days: pad(days), hrs: pad(hrs), mins: pad(mins), secs: pad(secs) };
}

export function AnnouncementBar() {
  const { days, hrs, mins, secs } = useCountdown(4.5);

  return (
    <div className="w-full bg-[var(--bb-black)] text-white">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-2 text-center text-[12px] font-semibold tracking-wide sm:text-[13px]">
        <span className="hidden sm:inline">
          PARTICIPE DA RÉGUA DE BRINDES NAS COMPRAS ACIMA DE R$ 300,00
        </span>
        <span className="sm:hidden">RÉGUA DE BRINDES ACIMA DE R$ 300,00</span>
        <div className="flex items-center gap-1 font-mono text-[12px] font-bold">
          {[days, hrs, mins, secs].map((v, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="rounded bg-white/15 px-1.5 py-0.5 tabular-nums">{v}</span>
              {i < 3 && <span className="text-white/50">:</span>}
            </span>
          ))}
        </div>
        <button className="rounded-full bg-[var(--bb-orange)] px-3 py-1 text-[12px] font-bold text-white transition-colors hover:bg-[var(--bb-orange-dark)]">
          Confira
        </button>
      </div>
    </div>
  );
}
