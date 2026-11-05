import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { useHelpTips } from "./HelpTipsPreference";
import { useFloatingTip } from "./useFloatingTip";

// Explicação opcional de um campo ou escolha, aberta por um botão "?".
//
// - Mouse: abre ao passar e continua aberta sobre a legenda.
// - Teclado: abre com o foco; Esc fecha.
// - Toque: o botão abre e fecha (alvo de 44 px no celular).
//
// O texto também fica num elemento oculto com o id informado, que o campo
// referencia em aria-describedby: o leitor de tela recebe a explicação ao
// chegar no campo, mesmo com as legendas visuais desligadas.

type HelpTipProps = {
  // id da descrição — use o mesmo no aria-describedby do campo.
  id: string;
  // Assunto, para o nome do botão ("Ajuda sobre: WhatsApp").
  topic: string;
  children: ReactNode;
};

function HelpTip({ id, topic, children }: HelpTipProps) {
  const { visible } = useHelpTips();
  const tip = useFloatingTip<HTMLButtonElement>("bottom", visible);
  // "click": aberta por toque/clique — só fecha com novo toque, Esc ou
  // toque fora; o mouse saindo não a fecha.
  const openedBy = useRef<"hover" | "focus" | "click" | null>(null);

  const { open, setOpen, triggerRef, tipRef } = tip;

  useEffect(() => {
    if (!open) {
      openedBy.current = null;
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || tipRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen, triggerRef, tipRef]);

  function openFrom(source: "hover" | "focus") {
    if (!open) openedBy.current = source;
    tip.show();
  }

  function closeUnlessClicked() {
    if (openedBy.current !== "click") tip.hideSoon();
  }

  return (
    <>
      <span id={id} hidden>
        {children}
      </span>

      {visible && (
        <button
          ref={triggerRef}
          type="button"
          className="a11y-help-button"
          aria-label={`Ajuda sobre: ${topic}`}
          aria-describedby={id}
          onClick={() => {
            if (open && openedBy.current !== "click") {
              openedBy.current = "click";
              return;
            }
            openedBy.current = open ? null : "click";
            setOpen(!open);
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") openFrom("hover");
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") closeUnlessClicked();
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) openFrom("focus");
          }}
          onBlur={() => {
            openedBy.current = null;
            tip.hide();
          }}
        >
          <span aria-hidden="true">?</span>
        </button>
      )}

      {open &&
        createPortal(
          <span
            ref={tipRef}
            className="a11y-tooltip a11y-help-bubble"
            data-placement={tip.placement}
            style={tip.tipStyle}
            aria-hidden="true"
            onPointerEnter={tip.cancelClose}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") closeUnlessClicked();
            }}
          >
            {children}
          </span>,
          document.body,
        )}
    </>
  );
}

export default HelpTip;
