// Região invisível que o leitor de tela anuncia quando o texto muda
// (ex.: "Foto 3 de 11", "Valor no ateliê: R$ 200,00"). Precisa estar na
// página antes da mudança; por isso fica sempre montada, vazia no início.
function LiveRegion({ message }: { message: string }) {
  return (
    <span className="a11y-sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </span>
  );
}

export default LiveRegion;
