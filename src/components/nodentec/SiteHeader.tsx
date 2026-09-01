import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import logo from "@/lib/nodentec-logo.png";

export function SiteHeader() {
  return (
    <header className="w-full border-b border-[var(--bb-border)] bg-white">
      <div className="relative mx-auto flex max-w-[1280px] items-center justify-center px-4 py-4 sm:px-6">
        <div className="flex items-center justify-center">
          <Image
            src={logo}
            alt="Nodentec"
            width={160}
            height={96}
            className="h-16 w-auto scale-[1.55] object-contain sm:h-20"
            priority
          />
        </div>
        <button
          aria-label="Carrinho"
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full text-[var(--bb-black)] transition-colors hover:bg-[var(--bb-orange-light)] hover:text-[var(--bb-orange)] sm:right-6"
        >
          <ShoppingCart className="h-5 w-5" strokeWidth={2} />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--bb-orange)] text-[10px] font-bold text-white">
            0
          </span>
        </button>
      </div>
    </header>
  );
}
