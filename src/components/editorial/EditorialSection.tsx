import type { ReactNode } from "react";

import { useInView } from "../../hooks/useInView";
import AmbientBackground from "../home/AmbientBackground";
import type { AmbientLight, AmbientParticle } from "../home/AmbientBackground";

// Seção das páginas de serviço com fundo animado e entrada ao rolar:
// recebe "is-revealed" na primeira vez que aparece, o que dispara a
// animação dos filhos marcados com .reveal (src/styles/editorial.css).

type EditorialSectionProps = {
  className: string;
  id?: string;
  particles: AmbientParticle[];
  lights: AmbientLight[];
  children: ReactNode;
};

function EditorialSection({ className, id, particles, lights, children }: EditorialSectionProps) {
  const { ref, revealed } = useInView<HTMLElement>(0.1);

  return (
    <section ref={ref} id={id} className={revealed ? `${className} is-revealed` : className}>
      <AmbientBackground particles={particles} lights={lights} />

      {children}
    </section>
  );
}

export default EditorialSection;
