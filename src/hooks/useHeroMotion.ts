import { useEffect } from "react";
import type { RefObject } from "react";

// Movimento da capa guiado pelo mouse e pela rolagem. O hook só grava
// variáveis CSS no elemento (--mx, --my de -1 a 1; --sy de 0 a 1) e o CSS
// decide quanto cada camada se desloca — assim tudo anima via transform,
// sem re-renderizar o React.
export function useHeroMotion(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastScroll = -1;
    let frame = 0;

    const render = () => {
      frame = 0;

      // Suavização: as camadas "alcançam" o mouse aos poucos.
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      hero.style.setProperty("--mx", currentX.toFixed(4));
      hero.style.setProperty("--my", currentY.toFixed(4));

      const rect = hero.getBoundingClientRect();
      const scroll = Math.min(Math.max(-rect.top / rect.height, 0), 1);
      if (scroll !== lastScroll) {
        hero.style.setProperty("--sy", scroll.toFixed(4));
        lastScroll = scroll;
      }

      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        frame = requestAnimationFrame(render);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      schedule();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    // Animações contínuas ficam pausadas enquanto a capa está fora da tela.
    const observer = new IntersectionObserver(([entry]) => {
      hero.classList.toggle("is-offscreen", !entry.isIntersecting);
    });
    observer.observe(hero);

    if (finePointer) {
      hero.addEventListener("pointermove", onPointerMove, { passive: true });
      hero.addEventListener("pointerleave", onPointerLeave);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", schedule);
    };
  }, [ref]);
}
