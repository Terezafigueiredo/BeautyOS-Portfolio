// Botão de pausar/retomar um movimento automático (galerias em faixa).
// Com "menos movimento" ativado no sistema o movimento já fica parado e o
// botão some (CSS em src/styles/a11y.css).
type MotionToggleProps = {
  paused: boolean;
  onToggle: () => void;
  // Ex.: "galeria" → "Pausar galeria" / "Retomar galeria".
  subject: string;
  className?: string;
};

function MotionToggle({ paused, onToggle, subject, className }: MotionToggleProps) {
  return (
    <button
      type="button"
      className={className ? `a11y-motion-toggle ${className}` : "a11y-motion-toggle"}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        {paused ? (
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
        ) : (
          <>
            <rect x="7" y="5" width="3.5" height="14" rx="1" />
            <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
          </>
        )}
      </svg>

      <span>{paused ? `Retomar ${subject}` : `Pausar ${subject}`}</span>
    </button>
  );
}

export default MotionToggle;
