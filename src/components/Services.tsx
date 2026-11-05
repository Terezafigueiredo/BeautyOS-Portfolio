import { useEffect, useState } from "react";

import { useInView } from "../hooks/useInView";
import LiveRegion from "./a11y/LiveRegion";
import { TooltipButton } from "./a11y/Tooltip";
import AmbientBackground from "./home/AmbientBackground";
import { SERVICES_LIGHTS, SERVICES_PARTICLES } from "./home/sectionAmbience";

import social from "../assets/optimized/social.jpg.webp";
import madrinha from "../assets/optimized/madrinha.jpg.webp";
import daminha from "../assets/optimized/daminha.jpg.webp";
import debutante from "../assets/optimized/debutante.jpg.webp";
import noiva from "../assets/optimized/noiva (1).jpeg.webp";
import formatura from "../assets/optimized/formatura.jpg.webp";
import aniversario from "../assets/optimized/aniversario.jpg.webp";
import ensaio from "../assets/optimized/ensaio.jpg.webp";
import automaquiagem from "../assets/optimized/automaquiagem.jpg.webp";

type Experience = {
  title: string;
  image: string;
  imageAlt: string;
  width: number;
  height: number;
};

const experiences: Experience[] = [
  {
    title: "Produção Social",
    image: social,
    imageAlt:
      "Antes e depois de maquiagem social: mulher de blusa azul com cabelo preso, à esquerda sem maquiagem e à direita com pele iluminada, cílios postiços e batom rosado",
    width: 1280,
    height: 1280,
  },
  {
    title: "Produção Madrinha",
    image: madrinha,
    imageAlt:
      "Madrinha de casamento com vestido longo verde-oliva de um ombro só e bolsa prateada, em salão decorado com flores",
    width: 720,
    height: 1280,
  },
  {
    title: "Produção Daminha",
    image: daminha,
    imageAlt:
      "Menina sorrindo com tiara de flores e pérolas, vestido amarelo e maquiagem leve, segurando um bichinho de pelúcia azul",
    width: 960,
    height: 1280,
  },
  {
    title: "Produção Debutante",
    image: debutante,
    imageAlt:
      "Debutante com vestido verde-água bordado com brilhos, coroa e cabelos cacheados soltos",
    width: 1200,
    height: 1600,
  },
  {
    title: "Produção Noiva",
    image: noiva,
    imageAlt:
      "Noiva com penteado preso, véu, colar de pérolas e buquê de rosas brancas",
    width: 591,
    height: 668,
  },
  {
    title: "Produção Formatura",
    image: formatura,
    imageAlt:
      "Formanda de beca e capelo pretos segurando o canudo de formatura em Medicina, com olhos esfumados e batom rosado",
    width: 745,
    height: 1280,
  },
  {
    title: "Produção Aniversários",
    image: aniversario,
    imageAlt:
      "Aniversariante com cabelos ondulados, camiseta rosa e maquiagem em tons rosados, sorrindo no ateliê",
    width: 1190,
    height: 1600,
  },
  {
    title: "Ensaios",
    image: ensaio,
    imageAlt:
      "Gestante em ensaio fotográfico de estúdio, com vestido preto longo de mangas bufantes e maquiagem em tons neutros",
    width: 939,
    height: 1280,
  },
  {
    title: "Curso de Automaquiagem",
    image: automaquiagem,
    imageAlt:
      "Antes e depois de automaquiagem: à esquerda o rosto sem maquiagem e à direita com pele preparada, cílios postiços e boca rosada",
    width: 1280,
    height: 1280,
  },
];

// Precisa acompanhar os mesmos breakpoints usados em style.css
// para .experience-card (900px -> 2 cards, 600px -> 1 card).
function getVisibleCards(width: number) {
  if (width <= 600) return 1;
  if (width <= 900) return 2;
  return 3;
}

function Services() {
  const { ref: sectionRef, revealed } = useInView<HTMLElement>(0.1);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [visibleCards, setVisibleCards] = useState(() =>
    typeof window === "undefined"
      ? 3
      : getVisibleCards(window.innerWidth)
  );

  const maxIndex = Math.max(experiences.length - visibleCards, 0);
  // Anunciado ao leitor de tela só depois de uma ação da pessoa.
  const [announcement, setAnnouncement] = useState("");

  const rangeLabel = (index: number) =>
    visibleCards === 1
      ? `Experiência ${index + 1} de ${experiences.length}`
      : `Experiências ${index + 1} a ${index + visibleCards} de ${experiences.length}`;

  function showPosition(index: number) {
    setCurrentIndex(index);
    setAnnouncement(`Mostrando ${rangeLabel(index).toLowerCase()}`);
  }

  useEffect(() => {
    function handleResize() {
      setVisibleCards(getVisibleCards(window.innerWidth));
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setCurrentIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  function nextSlide() {
    showPosition(currentIndex >= maxIndex ? 0 : currentIndex + 1);
  }

  function previousSlide() {
    showPosition(currentIndex <= 0 ? maxIndex : currentIndex - 1);
  }

  return (
    <section
      className={revealed ? "services is-revealed" : "services"}
      id="servicos"
      ref={sectionRef}
    >
      <AmbientBackground particles={SERVICES_PARTICLES} lights={SERVICES_LIGHTS} />

      <div className="services-heading reveal">
        <span className="services-eyebrow">Descubra seu momento</span>

        <h2>Experiências Tereza Figueiredo</h2>

        <p>Produções pensadas para diferentes momentos, estilos e histórias.</p>
      </div>

      <div
        className="experiences-carousel reveal"
        role="group"
        aria-roledescription="carrossel"
        aria-label="Experiências"
      >
        <TooltipButton
          className="carousel-arrow carousel-arrow-left"
          onClick={previousSlide}
          label="Ver experiências anteriores"
        >
          <span aria-hidden="true">←</span>
        </TooltipButton>

        <div className="experiences-viewport">
          <div
            className="experiences-track"
            style={{
              transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
            }}
          >
            {experiences.map((experience, index) => (
              <article className="experience-card" key={experience.title}>
                <img
                  src={experience.image}
                  alt={experience.imageAlt}
                  className="experience-image"
                  width={experience.width}
                  height={experience.height}
                  loading="lazy"
                />

                <div className="experience-overlay" />

                <div className="experience-content">
                  <span className="experience-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3>{experience.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>

        <TooltipButton
          className="carousel-arrow carousel-arrow-right"
          onClick={nextSlide}
          label="Ver próximas experiências"
        >
          <span aria-hidden="true">→</span>
        </TooltipButton>
      </div>

      <div className="carousel-dots">
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <button
            type="button"
            key={index}
            className={
              currentIndex === index
                ? "carousel-dot carousel-dot-active"
                : "carousel-dot"
            }
            onClick={() => showPosition(index)}
            aria-label={`Mostrar ${rangeLabel(index).toLowerCase()}`}
            aria-current={currentIndex === index ? "true" : undefined}
          />
        ))}
      </div>

      <LiveRegion message={announcement} />
    </section>
  );
}

export default Services;
