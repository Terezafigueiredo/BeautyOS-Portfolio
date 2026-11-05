import type { CSSProperties, ReactNode } from "react";

import { useInView } from "../../hooks/useInView";
import AmbientBackground from "../home/AmbientBackground";
import type { AmbientLight, AmbientParticle } from "../home/AmbientBackground";

// Capa editorial das páginas de serviço (Social, Debutante, Noiva):
// texto à esquerda e uma foto real do portfólio num arco dourado à direita.
// Estilos em src/styles/editorial.css.
//
// Regra da foto: o arquivo é exibido sem nenhuma alteração. Use fotos 3:4
// (a proporção da moldura), que aparecem inteiras, sem cortar o rosto.

export type EditorialPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

// Brilhos dourados ao redor do arco, em % do palco: só nas laterais e na
// base, fora da foto.
const HERO_SPARKS = [
  { x: 4, y: 30, size: 7, delay: 0.2 },
  { x: 8, y: 58, size: 4, delay: 1.4 },
  { x: 2, y: 80, size: 6, delay: 2.1 },
  { x: 94, y: 22, size: 5, delay: 0.8 },
  { x: 97, y: 48, size: 8, delay: 1.9 },
  { x: 92, y: 74, size: 4, delay: 0.5 },
  { x: 20, y: 97, size: 5, delay: 1.1 },
  { x: 80, y: 98, size: 6, delay: 2.6 },
];

type EditorialHeroProps = {
  // Classes próprias da página (ex.: "service-page-hero").
  className: string;
  photo: EditorialPhoto;
  particles: AmbientParticle[];
  lights: AmbientLight[];
  // Selo opcional no canto inferior esquerdo do arco (fora do rosto).
  badge?: ReactNode;
  // Sobrancelha, título, parágrafos e botão (.ed-button), nesta ordem.
  children: ReactNode;
};

function EditorialHero({ className, photo, particles, lights, badge, children }: EditorialHeroProps) {
  // inView pausa as animações da capa fora da tela.
  const { ref, inView } = useInView<HTMLElement>(0);

  return (
    <section ref={ref} className={inView ? `${className} ed-hero` : `${className} ed-hero is-offscreen`}>
      <AmbientBackground particles={particles} lights={lights} />

      <div className="ed-hero-content">{children}</div>

      <div className="ed-hero-stage">
        <div className="ed-hero-deco" aria-hidden="true">
          <span className="ed-hero-glow" />

          <svg className="ed-hero-arcs" viewBox="0 0 400 500" fill="none" focusable="false">
            <path d="M30 496V200a170 170 0 0 1 340 0v296" pathLength={1} />
            <path d="M8 470V196a192 192 0 0 1 384 0v274" pathLength={1} />
            <ellipse cx="200" cy="250" rx="196" ry="232" />
          </svg>

          {HERO_SPARKS.map((spark) => (
            <span
              key={`${spark.x}-${spark.y}`}
              className="ed-hero-spark"
              style={
                {
                  "--x": `${spark.x}%`,
                  "--y": `${spark.y}%`,
                  "--s": `${spark.size}px`,
                  "--d": `${spark.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <figure className="ed-hero-figure">
          <span className="ed-hero-frame" aria-hidden="true" />

          <div className="ed-hero-photo">
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              fetchPriority="high"
            />
          </div>
        </figure>

        {badge}
      </div>
    </section>
  );
}

export default EditorialHero;
