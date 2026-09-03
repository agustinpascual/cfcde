"use client";

import Image from "next/image";
import { useState } from "react";
import { MobilePurchaseBar, ShippingCalculator } from "../shared/ProductPurchaseTools";
import StockUrgency, { type EstoqueLote } from "../shared/StockUrgency";
import { assetRoot, desconto, galeria, moeda, parcelas, type Oferta, type Produto } from "./produto";
import styles from "./ProductPage.module.css";

const products = [
  ["combo-2.webp", "CAFÉ COM DEUS PAI VOL.6 (BROCHURA) + COPO", "R$89,90", "4 de R$22,48"],
  ["combo-3.webp", "A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA + MARCA-TEXTO", "R$64,90", "4 de R$16,23"],
  ["combo-4.webp", "2 LIVROS CAFÉ COM DEUS PAI VOL. 6 (BROCHURA) + 2 COPOS", "R$179,90", "4 de R$44,98"],
  ["combo-5.webp", "A VIDA QUE VOCÊ BUSCA ESTÁ NA CURA QUE VOCÊ PRECISA + PLANNER + MARCA-TEXTO", "R$129,90", "4 de R$32,48"],
  ["combo-6.webp", "PLANNER CAFÉ COM DEUS PAI + CANECA", "R$159,90", "4 de R$39,98"],
  ["combo-7.webp", "2 CANECAS + 2 LATAS DE CAFÉ GOURMET", "R$259,90", "4 de R$64,98"],
];

export type ProductPageProps = {
  produto: Produto;
  oferta: Oferta;
  onOferta: (indice: number) => void;
  onBuy: (quantity: number) => void;
  estoque?: EstoqueLote;
};

export default function ProductPage({ produto, oferta, onOferta, onBuy, estoque }: ProductPageProps) {
  const [selected, setSelected] = useState(0);
  const abatimento = desconto(oferta);
  /* Com mais de um pacote, a escolha substitui o seletor de quantidade —
     dois controles de quantidade na mesma tela só confundem. */
  const temPacotes = produto.ofertas.length > 1;
  const [quantity, setQuantity] = useState(1);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [cookies, setCookies] = useState(true);

  return (
    <main className={styles.page}>
      <section className={styles.product}>
        <a className={styles.back} href="/">← Voltar</a>
        <div className={styles.badges}>{abatimento ? <span>-{abatimento}%</span> : null}<span>Frete grátis</span></div>
        <div className={styles.breadcrumb}>{produto.breadcrumb}</div>
        <div className={styles.productGrid}>
          <div className={styles.gallery}>
            <div className={styles.thumbs} aria-label="Imagens do produto">
              {galeria.map((file, index) => (
                <button className={selected === index ? styles.thumbActive : ""} key={file} onClick={() => setSelected(index)} aria-label={`Ver imagem ${index + 1}`}>
                  <Image src={`${assetRoot}/${file}`} alt="" width={72} height={72} />
                </button>
              ))}
            </div>
            <div className={styles.galleryMain}>
              <div className={styles.mainImage}>
                <Image src={`${assetRoot}/${galeria[selected]}`} alt={produto.nome} fill priority sizes="(max-width: 767px) 100vw, 58vw" />
              </div>
              <div className={styles.dots} aria-hidden="true">{galeria.map((file, index) => <button key={file} className={selected === index ? styles.dotActive : ""} onClick={() => setSelected(index)} />)}</div>
              <ShippingCalculator />
            </div>
          </div>

          <div className={styles.info}>
            <h1>{produto.nome}</h1>
            <div className={styles.mobileBadges}>{abatimento ? <span>-{abatimento}%</span> : null}<span>Frete grátis</span></div>
            <div className={styles.price}>{oferta.comparado ? <s>{moeda(oferta.comparado)}</s> : null}<strong>{moeda(oferta.preco)}</strong></div>
            <p className={styles.installments}>{parcelas(oferta.preco)} <button>(Ver parcelas)</button></p>
            <p className={styles.freeShipping}>Frete grátis</p>
            {estoque ? <div className={styles.estoqueSlot}><StockUrgency {...estoque} /></div> : null}
            {temPacotes ? (
              <div className={styles.ofertas} role="radiogroup" aria-label="Escolha a quantidade">
                {produto.ofertas.map((opcao, indice) => {
                  const escolhida = opcao === oferta;
                  const economia = opcao.comparado ? opcao.comparado - opcao.preco : 0;
                  return (
                    <button
                      key={opcao.rotulo}
                      type="button"
                      role="radio"
                      aria-checked={escolhida}
                      className={`${styles.oferta} ${escolhida ? styles.ofertaAtiva : ""}`}
                      onClick={() => onOferta(indice)}
                    >
                      <span className={styles.ofertaTopo}>
                        <span className={styles.marcador} aria-hidden="true" />
                        <span className={styles.ofertaRotulo}>{opcao.rotulo}</span>
                      </span>
                      <span className={styles.ofertaPreco}>{moeda(opcao.preco)}</span>
                      <span className={styles.ofertaDetalhe}>
                        {opcao.unidades > 1 ? `${moeda(opcao.preco / opcao.unidades)} cada` : "Frete grátis"}
                      </span>
                      {economia > 0 ? <span className={styles.ofertaEconomia}>economize {moeda(economia)}</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {temPacotes ? null : <label className={styles.quantityLabel}>Quantidade</label>}
            <div className={styles.buyRow}>
              {temPacotes ? null : (
                <div className={styles.quantity}>
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)} aria-label="Aumentar quantidade">+</button>
                </div>
              )}
              <button className={styles.buy} onClick={() => onBuy(quantity)}>Comprar</button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.description}>
        <button className={styles.descriptionTitle} onClick={() => setDescriptionOpen((open) => !open)} aria-expanded={descriptionOpen}>
          <span>Descrição do Produto</span><span>{descriptionOpen ? "−" : "+"}</span>
        </button>
        {descriptionOpen && <div className={styles.descriptionBody}>
          <p><strong>*NÃO INCLUI CAIXA PERSONALIZADA*</strong></p>
          <p>Este combo especial inclui:</p>
          <p><strong>Livro Café com Deus Pai – Volume 6 (BROCHURA):</strong><br />Um convite diário para desfrutar da melhor companhia que um ser humano pode ter: Deus Pai. Receba porções de amor que irão renovar a sua fé e fortalecer sua caminhada espiritual.</p>
          <p><strong>Lata decorativa com 6 alfajores Velutti.</strong></p>
          <p><strong>Ecobag exclusiva:</strong><br />Perfeita para levar sua fé (e o que mais quiser!) por onde for — com estilo, praticidade e consciência.</p>
          <p><strong>Caneca personalizada:</strong><br />Para aquecer corpo e alma enquanto saboreia aquele café que abraça.</p>
          <p><strong>Caderno:</strong><br />Anote orações, inspirações ou ideias que tocarem seu coração. Um espaço só seu.</p>
          <p><strong>Lata de Café Gourmet:</strong><br />Porque momentos com Deus merecem um café especial. Aroma intenso e sabor marcante para acompanhar sua leitura.</p>
          <p><strong>Marca-página temático:</strong><br />Para nunca perder o fio da conversa com Deus.</p>
          <p><strong>Filtros de café individuais. Caixa com 10 modelos diferentes - Exclusividade no Brasil</strong><br />Praticidade e sabor na medida certa para o seu momento devocional.</p>
          <p><strong>Marca-texto:</strong><br />Destaque passagens, pensamentos e trechos que falarem ao seu coração.</p>
          <p><strong>Copo 250ml:</strong><br />Versátil, leve e ideal para o seu café em qualquer lugar.</p>
          <p><strong>Detalhes:</strong></p>
          <p>- Autor: Junior Rostirola</p><p>- Editora: Vélos</p><p>- Ano de publicação: 2025</p><p>- Formato: brochura</p><p>- Dimensões: 29.0 x 31.3 x 17.5 cm</p><p>- Peso aproximado do combo: 2.870 kg</p><p>- Idioma: Português</p>
          <p>SKU: COMBO520</p>
          <p>As imagens exibidas são meramente ilustrativas e têm o propósito de representar o produto de forma aproximada.</p>
        </div>}
      </section>

      <section className={styles.reviews}>
        <h2>Avaliações</h2><button>Adicionar uma avaliação</button><p>Seja o primeiro a avaliar este produto!</p>
      </section>

      <section className={styles.recommendations}>
        <p>QUEM VIU, VIU TAMBÉM</p><h2>Escolhidos especialmente para você</h2>
        <div className={styles.rail}>{products.map(([image, name, price, part]) => <article key={name}>
          <div className={styles.cardImage}><Image src={`${assetRoot}/${image}`} alt={name} fill sizes="240px" /></div>
          <h3>{name}</h3><strong>{price}</strong><span>{part}</span>
        </article>)}</div>
      </section>

      <MobilePurchaseBar name={produto.nome} price={moeda(oferta.preco)} originalPrice={oferta.comparado ? moeda(oferta.comparado) : null} installment={parcelas(oferta.preco)} quantity={quantity} onDecrease={() => setQuantity(q => Math.max(1, q - 1))} onIncrease={() => setQuantity(q => q + 1)} onBuy={() => onBuy(quantity)} />

      {cookies && <aside className={styles.cookies}><span>Ao navegar por este site você aceita o uso de cookies para agilizar a sua experiência de compra.</span><button onClick={() => setCookies(false)}>Entendi</button></aside>}
    </main>
  );
}
