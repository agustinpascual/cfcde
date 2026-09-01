"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import frontalImage from "@/lib/1-frontal.jpg";
import frontal25mImage from "@/lib/1-frontal (1).jpg";
import frontal50mImage from "@/lib/1-frontal (2).jpg";
import lateralImage from "@/lib/2-lateral.jpg";
import lateral25mImage from "@/lib/2-lateral (1).jpg";
import lateral50mImage from "@/lib/2-lateral (2).jpg";
import dimensionsImage from "@/lib/3-medida.jpg";
import dimensions25mImage from "@/lib/3-medida (1).jpg";
import dimensions50mImage from "@/lib/3-medida (2).jpg";
import baseImage from "@/lib/4-base.jpg";
import base25mImage from "@/lib/4-base (1).jpg";
import base50mImage from "@/lib/4-base (2).jpg";

const MODEL_IMAGES = {
  1: [frontalImage, lateralImage, dimensionsImage, baseImage],
  2: [frontal25mImage, lateral25mImage, dimensions25mImage, base25mImage],
  3: [frontal50mImage, lateral50mImage, dimensions50mImage, base50mImage],
};

const IMAGE_LABELS = ["vista frontal", "vista lateral", "medidas", "base"];

type ProductGalleryProps = {
  selectedModel: number;
};

export function ProductGallery({ selectedModel }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const images = MODEL_IMAGES[selectedModel as keyof typeof MODEL_IMAGES] ?? MODEL_IMAGES[1];

  const showPrevious = () => {
    setActive((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const showNext = () => {
    setActive((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  const handleTouchEnd = (endX: number) => {
    if (touchStartX.current === null) return;

    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 40) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  return (
    <div className="flex gap-3">
      <div className="hidden flex-col gap-2.5 sm:flex">
        {images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setActive(i)}
            className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-[var(--bb-gray-bg)] transition-all ${
              active === i
                ? "border-[var(--bb-orange)] shadow-[0_0_0_2px_var(--bb-orange-light)]"
                : "border-[var(--bb-border)] hover:border-[var(--bb-orange)]/50"
            }`}
            aria-label={`Ver imagem ${i + 1}`}
          >
            <Image src={img} alt="" width={64} height={64} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div
        className="relative aspect-[4/3] min-w-0 flex-1 touch-pan-y overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-gray-bg)] select-none lg:max-h-[450px]"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
        onTouchCancel={() => {
          touchStartX.current = null;
        }}
      >
        <Image
          key={`${selectedModel}-${active}`}
          src={images[active]}
          alt={`Amplificador modelo de ${selectedModel === 1 ? 15 : selectedModel === 2 ? 25 : 50} metros, ${IMAGE_LABELS[active]}`}
          fill
          className="pointer-events-none object-contain p-4"
          draggable={false}
          priority
        />

        <button
          type="button"
          onClick={showPrevious}
          className="absolute top-1/2 left-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--bb-black)] shadow-md backdrop-blur-sm active:scale-95 sm:hidden"
          aria-label="Ver imagem anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={showNext}
          className="absolute top-1/2 right-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--bb-black)] shadow-md backdrop-blur-sm active:scale-95 sm:hidden"
          aria-label="Ver próxima imagem"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute right-0 bottom-3 left-0 z-10 flex items-center justify-center gap-2 sm:hidden">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActive(index)}
              className={`h-2 rounded-full transition-all ${
                active === index ? "w-6 bg-[var(--bb-orange)]" : "w-2 bg-[var(--bb-muted-2)]/70"
              }`}
              aria-label={`Ver imagem ${index + 1}`}
              aria-current={active === index ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
