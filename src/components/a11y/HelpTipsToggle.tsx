import { useHelpTips } from "./HelpTipsPreference";

// Chave para ligar ou desligar as legendas de ajuda visuais. Leitores de
// tela continuam recebendo as descrições com a chave desligada.
function HelpTipsToggle({ label = "Legendas de ajuda", className }: { label?: string; className?: string }) {
  const { visible, setVisible } = useHelpTips();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      className={className ? `a11y-switch ${className}` : "a11y-switch"}
      onClick={() => setVisible(!visible)}
    >
      <span className="a11y-switch-track" aria-hidden="true">
        <span className="a11y-switch-thumb" />
      </span>

      <span className="a11y-switch-label">{label}</span>
    </button>
  );
}

export default HelpTipsToggle;
