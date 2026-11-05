import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, FocusEvent, PointerEvent, ReactNode } from "react";

import { useHelpTips } from "./HelpTipsPreference";
import { useFloatingTip } from "./useFloatingTip";

// Legenda visual para controles só com ícone (setas, pausa, WhatsApp).
// Aparece com o mouse e com o foco do TECLADO (não com toque nem clique),
// continua aberta com o mouse sobre ela e fecha com Esc.
//
// É só visual (aria-hidden): o texto é o mesmo nome acessível do controle
// (aria-label), então o leitor de tela não o ouve repetido.

export function useTooltip<T extends HTMLElement>(text: string) {
  const { visible } = useHelpTips();
  const tip = useFloatingTip<T>("top", visible);

  const triggerProps = {
    onPointerEnter: (event: PointerEvent<T>) => {
      if (event.pointerType === "mouse") tip.show();
    },
    onPointerLeave: (event: PointerEvent<T>) => {
      if (event.pointerType === "mouse") tip.hideSoon();
    },
    onFocus: (event: FocusEvent<T>) => {
      if (event.currentTarget.matches(":focus-visible")) tip.show();
    },
    onBlur: tip.hide,
  };

  const tooltip = tip.open
    ? createPortal(
        <span
          ref={tip.tipRef}
          className="a11y-tooltip"
          data-placement={tip.placement}
          style={tip.tipStyle}
          aria-hidden="true"
          onPointerEnter={tip.cancelClose}
          onPointerLeave={tip.hideSoon}
        >
          {text}
        </span>,
        document.body,
      )
    : null;

  return { ref: tip.triggerRef, triggerProps, tooltip };
}

type TooltipButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  // Nome acessível do botão, exibido também na legenda.
  label: string;
  children: ReactNode;
};

// Botão só com ícone: o mesmo texto vira aria-label e legenda visual.
export function TooltipButton({ label, children, type = "button", ...props }: TooltipButtonProps) {
  const { ref, triggerProps, tooltip } = useTooltip<HTMLButtonElement>(label);

  return (
    <>
      <button {...props} {...triggerProps} ref={ref} type={type} aria-label={label}>
        {children}
      </button>
      {tooltip}
    </>
  );
}
