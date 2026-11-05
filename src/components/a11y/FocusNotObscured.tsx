import { useEffect } from "react";

// Garante que o item focado pelo teclado não fique escondido atrás de um
// cabeçalho fixo (WCAG 2.4.11). A margem de rolagem do CSS resolve a maior
// parte dos casos; este ajuste cobre os que o navegador não rola sozinho
// (ex.: caixa de texto já parcialmente na tela, por trás do cabeçalho).
const GAP = 16;

function obscuringHeaderBottom(target: Element) {
  let bottom = 0;

  for (const header of document.querySelectorAll("header")) {
    if (header.contains(target)) continue;
    const position = getComputedStyle(header).position;
    if (position !== "fixed" && position !== "sticky") continue;
    bottom = Math.max(bottom, header.getBoundingClientRect().bottom);
  }

  return bottom;
}

function FocusNotObscured() {
  useEffect(() => {
    // Só age quando a navegação é pelo teclado (não em clique ou toque).
    // Não usa :focus-visible porque campos de data/hora só o recebem depois.
    let keyboard = false;

    function reveal(target: EventTarget | null) {
      if (!keyboard || !(target instanceof HTMLElement)) return;

      const headerBottom = obscuringHeaderBottom(target);
      if (!headerBottom) return;

      const rect = target.getBoundingClientRect();
      if (rect.top < headerBottom && rect.bottom > 0) {
        window.scrollBy({ top: rect.top - headerBottom - GAP, behavior: "auto" });
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") keyboard = true;
    };
    const onPointerDown = () => {
      keyboard = false;
    };
    const onFocusIn = (event: FocusEvent) => reveal(event.target);
    // Campos de data/hora trocam de parte (dia, mês, hora) com Tab sem novo
    // focusin, e o navegador rola sozinho: confere de novo após cada Tab.
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      // Espera a rolagem do próprio navegador terminar antes de conferir.
      requestAnimationFrame(() => requestAnimationFrame(() => reveal(document.activeElement)));
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return null;
}

export default FocusNotObscured;
