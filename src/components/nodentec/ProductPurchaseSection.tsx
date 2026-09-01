"use client";

import { useState } from "react";
import { BuyBox } from "./BuyBox";
import { ProductGallery } from "./ProductGallery";

export function ProductPurchaseSection() {
  const [selectedModel, setSelectedModel] = useState(1);

  return (
    <section className="mx-auto grid max-w-[1180px] items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 lg:py-8">
      <ProductGallery key={selectedModel} selectedModel={selectedModel} />
      <BuyBox selected={selectedModel} onSelect={setSelectedModel} />
    </section>
  );
}
