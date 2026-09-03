import { avisoTopo } from "./brand";

export function AnnouncementBar() {
  return (
    <div className="bg-[var(--sf-ink)] px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[.12em] text-white">
      {avisoTopo}
    </div>
  );
}
