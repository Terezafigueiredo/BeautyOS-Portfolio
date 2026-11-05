import { useEffect, useRef, useState } from "react";

// Observa quando um elemento entra na tela.
// inView: está visível agora (para pausar animações fora da tela).
// revealed: já apareceu ao menos uma vez (para animações de entrada).
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView, revealed };
}
