"use client";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { comboPlus } from "./produto";
import styles from "./CartDrawer.module.css";

type Props={open:boolean;quantity:number;onClose:()=>void;onQuantityChange:(quantity:number)=>void;productName?:string;productImage?:string;unitPrice?:number;productSlug?:string};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});

export default function CartDrawer({open,quantity,onClose,onQuantityChange,productName=comboPlus.nome,productImage=comboPlus.imagem,unitPrice=comboPlus.ofertas[0].preco,productSlug=comboPlus.ofertas[0].slug}:Props){
 const qty=Math.max(1,quantity), wasOpen=useRef(false);
 const [hasItem,setHasItem]=useState(quantity>0),[coupon,setCoupon]=useState("");
 const [couponStatus,setCouponStatus]=useState<"idle"|"valid"|"invalid">("idle");
 useEffect(()=>{if(open&&!wasOpen.current){setHasItem(quantity>0);setCouponStatus("idle")}wasOpen.current=open},[open,quantity]);
 useEffect(()=>{if(!open)return;const overflow=document.body.style.overflow;const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};document.body.style.overflow="hidden";window.addEventListener("keydown",escape);return()=>{document.body.style.overflow=overflow;window.removeEventListener("keydown",escape)}},[open,onClose]);
 const remove=()=>{setHasItem(false);onQuantityChange(0)};
 const decrease=()=>qty<=1?remove():onQuantityChange(qty-1);
 const apply=()=>setCouponStatus(coupon.trim().toUpperCase()==="PRIMEIRACOMPRA"?"valid":"invalid");
 const total=hasItem?unitPrice*qty:0;
 return <div className={`${styles.root} ${open?styles.open:""}`} aria-hidden={!open}>
  <button className={styles.overlay} type="button" aria-label="Fechar carrinho" tabIndex={open?0:-1} onClick={onClose}/>
  <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title">
   <header className={styles.header}><ShoppingBag className={styles.bag} aria-hidden="true" strokeWidth={1.5}/><h2 id="cart-title">Sua sacola</h2><button className={styles.iconButton} type="button" onClick={onClose} aria-label="Fechar carrinho"><X aria-hidden="true" strokeWidth={1.5}/></button></header>
   <div className={styles.content}>{hasItem?<article className={styles.product}>
    <div className={styles.imageWrap}><Image src={productImage} alt={productName} fill sizes="200px"/></div>
    <div className={styles.productInfo}><h3>{productName}</h3><p>{money.format(unitPrice)}</p><div className={styles.quantityRow}><label>Quantidade:</label><div className={styles.stepper} aria-label="Quantidade do produto"><button type="button" aria-label={qty===1?"Remover produto":"Diminuir quantidade"} onClick={decrease}><Minus aria-hidden="true"/></button><span aria-live="polite">{qty}</span><button type="button" aria-label="Aumentar quantidade" onClick={()=>onQuantityChange(qty+1)}><Plus aria-hidden="true"/></button></div></div></div>
    <button className={styles.remove} type="button" onClick={remove} aria-label={`Remover ${productName}`}><Trash2 aria-hidden="true" strokeWidth={1.5}/></button>
   </article>:<div className={styles.empty}><ShoppingBag aria-hidden="true" strokeWidth={1.3}/><h3>Sua sacola está vazia</h3><p>Adicione produtos para continuar sua compra.</p></div>}</div>
   <footer className={styles.footer}><div className={styles.summary}><span>Sub-total:</span><strong>{money.format(total)}</strong></div>
    <div className={styles.coupon}><label htmlFor="cart-coupon">CUPOM DE DESCONTO</label><div><input id="cart-coupon" value={coupon} onChange={e=>{setCoupon(e.target.value);setCouponStatus("idle")}} placeholder="Digite seu Cupom"/><button type="button" onClick={apply}>Aplicar</button></div>{couponStatus!=="idle"&&<p className={couponStatus==="valid"?styles.success:styles.error} role="status">{couponStatus==="valid"?"Cupom aplicado com sucesso!":"Cupom inválido."}</p>}</div>
    <div className={styles.total}><span>Total:</span><strong>{money.format(total)}</strong></div>{hasItem?<Link href={`/checkout?produto=${encodeURIComponent(productSlug)}`} className={styles.checkout}>Finalizar compra</Link>:<span className={`${styles.checkout} ${styles.disabled}`}>Finalizar compra</span>}<button className={styles.continue} type="button" onClick={onClose}>Continuar comprando</button>
   </footer>
  </aside>
 </div>
}
