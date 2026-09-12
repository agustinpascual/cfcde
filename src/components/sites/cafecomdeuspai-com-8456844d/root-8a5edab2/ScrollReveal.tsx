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
    items.forEach((element) => {
      element.classList.add(styles.item);
      const siblings = element.parentElement ? [...element.parentElement.children] : [];
      const index = Math.max(0, siblings.indexOf(element));
      element.style.setProperty("--reveal-delay", `${Math.min(index, 4) * 85}ms`);
    });
    const elements = [...sections, ...items];
    if (reduced) {
      elements.forEach((element) => element.classList.add(styles.visible));
      return;
    }
    const timers = new Set<number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.classList.add(styles.visible);
        const timer = window.setTimeout(() => {
          element.classList.add(styles.settled);
          timers.delete(timer);
        }, 1250);
        timers.add(timer);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
  return null;
}
