// Primeiro item do Tab: leva direto ao conteúdo principal, pulando o
// cabeçalho e o menu. Fica invisível até receber o foco do teclado.
// O destino precisa de tabIndex={-1} para receber o foco.
function SkipLink({ targetId = "conteudo", label = "Pular para o conteúdo" }: { targetId?: string; label?: string }) {
  return (
    <a href={`#${targetId}`} className="a11y-skip-link">
      {label}
    </a>
  );
}

export default SkipLink;
