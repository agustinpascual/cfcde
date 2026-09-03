"use client";

import { useEffect } from "react";
import styles from "./ScrollReveal.module.css";

export default function ScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-cdp-home]");
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = [...root.querySelectorAll<HTMLElement>("main section")];
    const items = [...root.querySelectorAll<HTMLElement>("main section a, main section article, main section button")]
      .filter((element) => element.querySelector("img"));

    sections.forEach((element) => element.classList.add(styles.section));
    items.forEach((element, index) => {
      element.classList.add(styles.item);
      element.style.setProperty("--reveal-delay", `${(index % 5) * 70}ms`);
    });
    const elements = [...sections, ...items];
    if (reduced) {
      elements.forEach((element) => element.classList.add(styles.visible));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add(styles.visible);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -7% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}
