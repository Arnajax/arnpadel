"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/* Alles wat bij het binnenscrollen rustig omhoog komt. */
const REVEAL = [
  ".section-title", ".section-sub", ".tp-grid > *",
  ".kobro-logos", ".kobro-heading", ".kobro-body", ".kobro-ctas",
  ".ts-heading", ".ts-subline", ".ts-tabs",
  ".community-eyebrow", ".community-heading", ".community-body", ".community-cta", ".community-note", ".community-secondary",
  ".memoriam-photo", ".memoriam-eyebrow", ".memoriam-name",
].join(", ");

/**
 * Beweging op de homepage:
 * 1. Zacht scrollen (Lenis, alleen muis/trackpad; touch blijft native).
 * 2. Intro: de woorden van de kop schuiven omhoog uit hun regel.
 * 3. Scroll-scène: de hero-video krimpt tot een kaart, de kaderlijn tekent zich,
 *    de tagline komt erin. De hero plakt (CSS sticky) zolang .hero-track duurt.
 * 4. Reveals: secties komen één keer zacht omhoog.
 * Bij prefers-reduced-motion gebeurt niets en blijft alles statisch zichtbaar.
 */
export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = document.querySelector<HTMLElement>("[data-hero-track]");
    track?.classList.add("hero-track--anim");

    const lenis = new Lenis({ autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // In-page links (#trainers, #rackettest) via Lenis, met ruimte voor de vaste header.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const id = a?.getAttribute("href");
      if (!a || !id || id === "#") return;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72, duration: 1.2 });
    };
    document.addEventListener("click", onClick);

    const ctx = gsap.context(() => {
      // 2. Intro
      gsap.timeline({ delay: 0.15 })
        .fromTo("[data-hero-word]", { yPercent: 110 }, { yPercent: 0, duration: 1.05, ease: "expo.out", stagger: 0.09 })
        .fromTo("[data-hero-intro]", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.07, clearProps: "transform" }, 0.35);

      // 3. Scroll-scène
      const mm = gsap.matchMedia();
      mm.add({ isMobile: "(max-width: 767px)", isDesktop: "(min-width: 768px)" }, () => {
        const hero = document.querySelector<HTMLElement>("[data-hero]");
        if (!track || !hero) return;
        const v = (name: string) => getComputedStyle(hero).getPropertyValue(name).trim();
        const cardT = v("--card-t"), cardX = v("--card-x"), cardB = v("--card-b"), cardR = v("--card-r");

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: track, start: "top top", end: "bottom bottom", scrub: 0.8 },
        });
        tl.fromTo("[data-hero-media]",
            { clipPath: "inset(0px 0px 0% 0px round 0px)" },
            { clipPath: `inset(${cardT} ${cardX} ${cardB} ${cardX} round ${cardR})`, duration: 0.55, ease: "power2.inOut" }, 0)
          .fromTo("[data-hero-video]", { scale: 1.12 }, { scale: 1, duration: 0.55, ease: "power2.inOut" }, 0)
          .fromTo("[data-hero-overlay]", { opacity: 1 }, { opacity: 0.18, duration: 0.5 }, 0.05)
          .fromTo("[data-hero-copy]", { opacity: 1, y: 0 }, { opacity: 0, y: -48, duration: 0.22 }, 0)
          .fromTo(".hero-scroll", { opacity: 1 }, { opacity: 0, duration: 0.08 }, 0)
          // kaderlijn: boven → rechts → onder → links, als één doorlopende pen
          .fromTo(".hero-frame-line--t", { scaleX: 0 }, { scaleX: 1, duration: 0.08 }, 0.5)
          .fromTo(".hero-frame-line--r", { scaleY: 0 }, { scaleY: 1, duration: 0.08 }, 0.58)
          .fromTo(".hero-frame-line--b", { scaleX: 0 }, { scaleX: 1, duration: 0.08 }, 0.66)
          .fromTo(".hero-frame-line--l", { scaleY: 0 }, { scaleY: 1, duration: 0.08 }, 0.74)
          .fromTo("[data-frame-label]", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.1 }, 0.78)
          .fromTo("[data-hero-after]", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.18, stagger: 0.06, ease: "power2.out" }, 0.6)
          .to({}, { duration: 0.12 }, 0.88);

        // Knop in de tagline pas klikbaar als hij zichtbaar is.
        tl.eventCallback("onUpdate", () => {
          hero.classList.toggle("hero--after", tl.progress() > 0.7);
        });
      });

      // 4. Reveals
      gsap.utils.toArray<HTMLElement>(REVEAL).forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 32 }, {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out", clearProps: "transform,opacity",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      document.removeEventListener("click", onClick);
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      track?.classList.remove("hero-track--anim");
    };
  }, []);

  return null;
}
