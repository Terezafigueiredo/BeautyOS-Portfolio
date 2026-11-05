import { useRef } from "react";

import { useHeroMotion } from "../../hooks/useHeroMotion";
import HeroScene from "./HeroScene";
import { IconArrow, IconDiamond, IconHeart, IconSparkles } from "./heroIcons";

const FEATURES = [
  { Icon: IconHeart, text: "Beleza real" },
  { Icon: IconSparkles, text: "Momentos únicos" },
  { Icon: IconDiamond, text: "Resultados que encantam" },
];

function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  useHeroMotion(heroRef);

  return (
    <section className="th-hero" id="inicio" ref={heroRef}>
      <div className="th-hero-backdrop" aria-hidden="true" />

      <div className="th-hero-content">
        <span className="th-hero-eyebrow">Beauty Artist</span>

        <h1 className="th-hero-title">
          <span className="th-line">Realce a beleza</span>{" "}
          <span className="th-line th-accent">que já existe</span>{" "}
          <span className="th-line th-accent">em você.</span>
        </h1>

        <p className="th-hero-text">
          Maquiagem profissional para momentos especiais, com atendimento
          personalizado e acabamento impecável.
        </p>

        <div className="th-hero-actions">
          <a href="#agendamento-formulario" className="th-btn th-btn-primary">
            <span>Agendar meu horário</span>
            <IconArrow className="th-btn-arrow" />
          </a>

          <a href="#portfolio" className="th-btn th-btn-outline">
            Ver portfólio
          </a>
        </div>

        <ul className="th-hero-features">
          {FEATURES.map(({ Icon, text }) => (
            <li key={text}>
              <span className="th-feature-icon">
                <Icon />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <HeroScene />

      <a href="#sobre" className="th-scroll-cue">
        <span className="th-scroll-mouse" aria-hidden="true">
          <span />
        </span>
        <span className="th-sr-only">Rolar para a próxima seção</span>
      </a>
    </section>
  );
}

export default Hero;
