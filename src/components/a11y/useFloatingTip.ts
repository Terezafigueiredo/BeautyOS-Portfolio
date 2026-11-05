import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Base das legendas flutuantes (Tooltip e HelpTip): posição fixa na tela,
// calculada a partir do elemento de origem, que troca de lado e se encosta
// nas margens para nunca sair da tela em celulares pequenos. Fecha com Esc
// e acompanha a rolagem enquanto estiver aberta.

const GAP = 8;
const EDGE = 8;
// Tempo para o mouse ir do elemento até a legenda sem que ela feche.
const CLOSE_DELAY = 150;

type Placement = "top" | "bottom";

export function useFloatingTip<T extends HTMLElement>(prefer: Placement, enabled: boolean) {
  const triggerRef = useRef<T>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; placement: Placement } | null>(null);

  const cancelClose = useCallback(() => window.clearTimeout(closeTimer.current), []);

  const show = useCallback(() => {
    cancelClose();
    if (enabled) setOpen(true);
  }, [cancelClose, enabled]);

  const hide = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  const hideSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, [cancelClose]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;

    const rect = trigger.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;

    const above = rect.top - GAP - height;
    const below = rect.bottom + GAP;
    const fitsAbove = above >= EDGE;
    const fitsBelow = below + height <= window.innerHeight - EDGE;

    const placement: Placement =
      prefer === "top" ? (fitsAbove || !fitsBelow ? "top" : "bottom") : fitsBelow || !fitsAbove ? "bottom" : "top";

    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, EDGE),
      window.innerWidth - width - EDGE,
    );

    setPosition({ top: placement === "top" ? above : below, left, placement });
  }, [prefer]);

  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    place();

    // Captura no window: o primeiro Esc fecha só a legenda, sem fechar
    // junto um menu ou formulário aberto por trás dela.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Enquanto a posição não é medida, a legenda fica invisível (sem piscar).
  const tipStyle: CSSProperties = position
    ? { top: position.top, left: position.left }
    : { top: 0, left: 0, visibility: "hidden" };

  return {
    triggerRef,
    tipRef,
    open,
    setOpen,
    show,
    hide,
    hideSoon,
    cancelClose,
    placement: position?.placement ?? prefer,
    tipStyle,
  };
}
