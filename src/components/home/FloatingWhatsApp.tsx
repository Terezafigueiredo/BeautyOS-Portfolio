import { WHATSAPP_LINK } from "../../config/contact";
import { useTooltip } from "../a11y/Tooltip";
import { IconWhatsApp } from "./heroIcons";

const LABEL = "Conversar pelo WhatsApp (abre em nova aba)";

function FloatingWhatsApp() {
  const { ref, triggerProps, tooltip } = useTooltip<HTMLAnchorElement>(LABEL);

  // aside: atalho de contato como região própria, fora do conteúdo principal.
  return (
    <aside aria-label="Contato rápido">
      <a
        ref={ref}
        {...triggerProps}
        href={WHATSAPP_LINK}
        className="th-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={LABEL}
      >
        <IconWhatsApp />
      </a>
      {tooltip}
    </aside>
  );
}

export default FloatingWhatsApp;
