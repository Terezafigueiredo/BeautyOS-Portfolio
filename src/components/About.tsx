import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { useInView } from "../hooks/useInView";
import LiveRegion from "./a11y/LiveRegion";
import { TooltipButton } from "./a11y/Tooltip";
import AmbientBackground from "./home/AmbientBackground";
import type { AmbientLight, AmbientParticle } from "./home/AmbientBackground";
import { IconArrow } from "./home/heroIcons";

import about1 from "../assets/optimized/about1.jpg.webp";
import about2 from "../assets/optimized/about2.jpg.webp";
import about3 from "../assets/optimized/about3.jpg.webp";
import about4 from "../assets/optimized/about4.jpg.webp";
import about5 from "../assets/optimized/about5.jpg.webp";
import about6 from "../assets/optimized/about6.jpg.webp";

// Fotos novas (pasta fotos, out/2026) — ao final do carrossel.
import aboutNova01 from "../assets/optimized/sobre-perfil-01.webp";
import aboutNova02 from "../assets/optimized/sobre-perfil-02.webp";
import aboutNova03 from "../assets/optimized/sobre-perfil-03.webp";
import aboutNova04 from "../assets/optimized/sobre-perfil-04.webp";
import aboutNova05 from "../assets/optimized/sobre-perfil-05.webp";

type AboutImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const aboutImages: AboutImage[] = [
  {
    src: about1,
    alt: "Maquiadora aplicando pó com pincel no rosto de uma cliente de robe vermelho e cabelos ondulados",
    width: 738,
    height: 1294,
  },
  {
    src: about2,
    alt: "Maquiadora segurando uma paleta de maquiagem enquanto ajusta o cabelo de uma cliente de robe lilás",
    width: 530,
    height: 961,
  },
  {
    src: about3,
    alt: "Maquiadora aplicando blush com pincel em uma cliente de robe azul, diante de uma cortina de luzes",
    width: 738,
    height: 1192,
  },
  {
    src: about4,
    alt: "Ateliê de Tereza Figueiredo com espelho iluminado e bancada de maquiagens, durante a preparação dos cabelos de duas clientes",
    width: 590,
    height: 737,
  },
  {
    src: about5,
    alt: "Tereza Figueiredo descendo os degraus de um espaço de eventos ao ar livre, usando vestido longo estampado em rosa e laranja",
    width: 1280,
    height: 853,
  },
  {
    src: about6,
    alt: "Maquiadora de blusa rosa finalizando a maquiagem de uma noiva com arranjo de flores brancas no cabelo, em um jardim",
    width: 433,
    height: 334,
  },
  {
    src: aboutNova01,
    alt: "Tereza Figueiredo finalizando a maquiagem de uma cliente de vestido vinho, em ambiente de luz quente",
    width: 1066,
    height: 1600,
  },
  {
    src: aboutNova02,
    alt: "Tereza Figueiredo maquiando uma cliente de robe claro sentada ao ar livre, com um vestido azul pendurado ao fundo",
    width: 565,
    height: 931,
  },
  {
    src: aboutNova03,
    alt: "Tereza Figueiredo aplicando pó com pincel em uma noiva de robe branco, com legenda comemorativa do dia da noiva",
    width: 738,
    height: 1080,
  },
  {
    src: aboutNova04,
    alt: "Tereza Figueiredo de preto ao lado de uma noiva de robe branco sentada, em um jardim decorado com flores brancas",
    width: 1067,
    height: 1600,
  },
  {
    src: aboutNova05,
    alt: "Tereza Figueiredo ajustando o cabelo de uma noiva de robe branco, em um jardim decorado com flores brancas",
    width: 1067,
    height: 1600,
  },
];

// Brilhos dourados discretos ao redor da moldura (mesmo efeito da capa).
// Posições fixas, em % da área da galeria.
const SPARKS = [
  { x: -4, y: 12, size: 6, delay: 0, duration: 4600 },
  { x: 6, y: 46, size: 4, delay: 900, duration: 5200 },
  { x: -2, y: 78, size: 7, delay: 1600, duration: 4200 },
  { x: 98, y: 8, size: 5, delay: 400, duration: 5600 },
  { x: 102, y: 38, size: 7, delay: 1200, duration: 4800 },
  { x: 95, y: 70, size: 4, delay: 2000, duration: 5000 },
  { x: 40, y: -4, size: 5, delay: 700, duration: 4400 },
  { x: 70, y: -2, size: 4, delay: 2400, duration: 5400 },
];

const sparkStyle = (spark: (typeof SPARKS)[number]) =>
  ({
    "--x": `${spark.x}%`,
    "--y": `${spark.y}%`,
    "--s": `${spark.size}px`,
    "--d": `${spark.delay}ms`,
    "--t": `${spark.duration}ms`,
  }) as CSSProperties;

// Fundo animado da seção (AmbientBackground). Posições em % da seção:
// [x, y] no desktop e [xm, ym] no celular — sempre nos espaços vazios (ao
// redor do carrossel, faixas superior/inferior e margens laterais), nunca
// na área dos textos.
// prettier-ignore
const PARTICLES: AmbientParticle[] = [
  [3, 12, 1, 3, 5, "gold", 2, 18],
  [6, 34, 98, 6, 3, "rose", 1, 24],
  [2, 58, 1, 18, 8, "gold", 3, 16],
  [5, 82, 98, 22, 4, "rose", 2, 21],
  [11, 95, 1, 30, 3, "gold", 1, 26],
  [24, 4, 50, 1, 6, "rose", 2, 19],
  [38, 3, 20, 8, 4, "gold", 1, 23],
  [44, 18, 80, 14, 7, "gold", 3, 17],
  [46, 40, 98, 36, 3, "rose", 1, 25],
  [43, 62, 1, 40, 6, "rose", 2, 20],
  [45, 84, 98, 48, 4, "gold", 2, 22],
  [30, 96, 1, 55, 5, "rose", 2, 18],
  [18, 2, 98, 62, 3, "gold", 1, 27],
  [47, 6, 1, 70, 9, "gold", 3, 15],
  [96, 8, 98, 76, 6, "rose", 2, 21],
  [98, 30, 1, 84, 4, "gold", 1, 24],
  [95, 52, 98, 90, 7, "gold", 3, 18],
  [98, 74, 1, 94, 3, "rose", 1, 26],
  [94, 94, 60, 2, 6, "gold", 2, 19],
  [70, 97, 30, 99, 4, "rose", 2, 23],
  [60, 2, 70, 4, 3, "gold", 1, 25],
  [84, 3, 88, 30, 5, "rose", 2, 20],
  [1, 26, 1, 12, 4, "gold", 2, 22],
  [20, 99, 98, 98, 5, "gold", 2, 17],
  [33, 1, 1, 46, 7, "rose", 3, 16],
  [99, 90, 1, 62, 5, "gold", 2, 21],
  [9, 8, 10, 4, 24, "rose", 4, 26],
  [41, 30, 90, 20, 18, "gold", 4, 22],
  [4, 70, 6, 34, 30, "champagne", 4, 28],
  [47, 92, 50, 99, 22, "rose", 4, 24],
  [96, 40, 92, 10, 26, "champagne", 4, 27],
  [62, 99, 12, 2, 20, "gold", 4, 23],
];

// prettier-ignore
const LIGHTS: AmbientLight[] = [
  [2, 22, 0, 8, 380, "rose", 22],
  [28, 72, 72, 30, 320, "champagne", 26],
  [46, 6, 92, 2, 220, "rose", 20],
  [97, 16, 106, 52, 300, "champagne", 24],
  [95, 88, 0, 72, 340, "rose", 28],
  [12, 100, 100, 96, 280, "champagne", 21],
];

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function About() {
  // Quem pede menos movimento não recebe troca automática de fotos.
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const [currentImage, setCurrentImage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(reducedMotion);
  // Anúncio para leitores de tela — só quando a pessoa troca a foto (setas,
  // pontos ou deslizar), nunca na troca automática.
  const [announcement, setAnnouncement] = useState("");
  // Slides já carregados (o atual e os vizinhos): os demais só baixam a
  // imagem quando estiverem perto de aparecer.
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0, 1, aboutImages.length - 1]));

  const { ref: sectionRef, inView, revealed } = useInView<HTMLElement>(0.15);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // A troca automática para com o mouse ou o foco do teclado sobre as
  // fotos, fora da tela ou quando a pessoa pausa.
  const autoplay = inView && !paused && !focused && !userPaused;

  function nextImage() {
    setCurrentImage((current) =>
      current === aboutImages.length - 1 ? 0 : current + 1
    );
  }

  function showImage(index: number) {
    const total = aboutImages.length;
    const next = (index + total) % total;
    setCurrentImage(next);
    setAnnouncement(`Foto ${next + 1} de ${total}`);
  }

  useEffect(() => {
    if (!autoplay) return;

    const interval = window.setInterval(() => {
      nextImage();
    }, 3500);

    return () => window.clearInterval(interval);
  }, [autoplay]);

  // Ao trocar de slide, marca o atual e os vizinhos para carregar.
  useEffect(() => {
    const total = aboutImages.length;
    setLoadedSlides((current) => {
      const next = new Set(current);
      [currentImage, (currentImage + 1) % total, (currentImage - 1 + total) % total].forEach((index) => next.add(index));
      return next.size === current.size ? current : next;
    });
  }, [currentImage]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchEndX.current = null;
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    touchEndX.current = event.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (
      touchStartX.current === null ||
      touchEndX.current === null
    ) {
      return;
    }

    const distance =
      touchStartX.current - touchEndX.current;

    const minimumSwipeDistance = 50;

    if (distance > minimumSwipeDistance) {
      showImage(currentImage + 1);
    }

    if (distance < -minimumSwipeDistance) {
      showImage(currentImage - 1);
    }
  }

  const sectionClass = [
    "about",
    revealed ? "is-revealed" : "",
    inView ? "" : "is-offscreen",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass} id="sobre" ref={sectionRef}>
      <div className="about-backdrop" aria-hidden="true" />

      <AmbientBackground particles={PARTICLES} lights={LIGHTS} />

      <div className="about-gallery about-reveal">
        <div className="about-decor" aria-hidden="true">
          <span className="about-glow" />
          {SPARKS.map((spark) => (
            <span
              key={`${spark.x}-${spark.y}`}
              className="th-spark"
              style={sparkStyle(spark)}
            />
          ))}
        </div>

        <div className="about-frame">
          <span className="about-arc about-arc-outer" aria-hidden="true" />
          <span className="about-arc" aria-hidden="true" />
          <span className="about-frame-ring" aria-hidden="true" />

          <div
            className="about-slideshow"
            role="group"
            aria-roledescription="carrossel"
            aria-label="Fotos de Tereza Figueiredo em atendimento"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setFocused(false);
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {aboutImages.map((image, index) => {
              const active = index === currentImage;

              return (
                <img
                  key={image.src}
                  src={loadedSlides.has(index) ? image.src : undefined}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  aria-hidden={active ? undefined : true}
                  className={active ? "about-slide active" : "about-slide"}
                />
              );
            })}

            <div className="about-photo-overlay">
              <span>10 anos</span>

              <small>
                de experiência transformando beleza
              </small>
            </div>

            <TooltipButton
              className="about-arrow about-arrow-left"
              onClick={() => showImage(currentImage - 1)}
              label="Ver foto anterior"
            >
              <IconArrow />
            </TooltipButton>

            <TooltipButton
              className="about-arrow about-arrow-right"
              onClick={() => showImage(currentImage + 1)}
              label="Ver próxima foto"
            >
              <IconArrow />
            </TooltipButton>
          </div>
        </div>

        <div className="about-controls">
          <div className="about-dots">
            {aboutImages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={
                  index === currentImage
                    ? "about-dot active"
                    : "about-dot"
                }
                onClick={() => showImage(index)}
                aria-label={`Ver foto ${index + 1} de ${aboutImages.length}`}
                aria-current={index === currentImage ? "true" : undefined}
              />
            ))}
          </div>

          <TooltipButton
            className="about-pause"
            onClick={() => setUserPaused(!userPaused)}
            label={
              userPaused
                ? "Retomar troca automática das fotos"
                : "Pausar troca automática das fotos"
            }
          >
            {userPaused ? <IconPlay /> : <IconPause />}
          </TooltipButton>
        </div>

        <LiveRegion message={announcement} />
      </div>

      <div className="about-content">
        <span className="about-eyebrow about-reveal">
          Sobre mim
        </span>

        <h2 className="about-reveal">
          Beleza é sobre se sentir
          <span> ainda mais você.</span>
        </h2>

        <span className="about-ornament about-reveal" aria-hidden="true" />

        <p className="about-reveal">
          Transformo minha paixão pela maquiagem em experiências únicas,
          valorizando a beleza, a personalidade e a essência de cada cliente.
        </p>

        <p className="about-reveal">
          Ao longo de 10 anos de trajetória, venho me especializando,
          aperfeiçoando técnicas e acompanhando novas tendências. Trabalho com
          produtos profissionais, incluindo marcas importadas cuidadosamente
          selecionadas, para oferecer qualidade, acabamento e durabilidade em
          cada produção.
        </p>

        <p className="about-reveal">
          Para mim, maquiagem vai além da estética. Cada atendimento é pensado
          de forma personalizada, respeitando seu estilo, sua essência e o
          momento que você deseja viver.
        </p>

        <a href="#portfolio" className="about-button about-reveal">
          <span>Conheça meu trabalho</span>
          <IconArrow className="about-button-arrow" />
        </a>
      </div>
    </section>
  );
}

export default About;
