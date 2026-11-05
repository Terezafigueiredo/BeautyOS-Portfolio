import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import BookingModal from "../components/BookingModal";
import HelpTip from "../components/a11y/HelpTip";
import HelpTipsToggle from "../components/a11y/HelpTipsToggle";
import LiveRegion from "../components/a11y/LiveRegion";
import SkipLink from "../components/a11y/SkipLink";
import ServiceHeader from "../components/ServiceHeader";
import EditorialGallery from "../components/editorial/EditorialGallery";
import EditorialHero from "../components/editorial/EditorialHero";
import EditorialSection from "../components/editorial/EditorialSection";
import {
  DEBUTANTE_GALLERY_LIGHTS,
  DEBUTANTE_GALLERY_PARTICLES,
  DEBUTANTE_HERO_LIGHTS,
  DEBUTANTE_HERO_PARTICLES,
  DEBUTANTE_PACKAGES_LIGHTS,
  DEBUTANTE_PACKAGES_PARTICLES,
} from "../components/editorial/editorialAmbience";
import { HELP_TEXTS } from "../config/helpTexts";
import { bridalDebutantePriceLabels } from "../lib/pricing";

import debutante1 from "../assets/optimized/debutante1.jpeg.webp";
import debutante2 from "../assets/optimized/debutante2.jpeg.webp";
import debutante3 from "../assets/optimized/debutante3.jpeg.webp";
import debutante4 from "../assets/optimized/debutante4.jpeg.webp";
import debutante5 from "../assets/optimized/debutante5.jpeg.webp";
import debutante6 from "../assets/optimized/debutante6.jpeg.webp";
import debutante7 from "../assets/optimized/debutante7.jpeg.webp";
import debutante8 from "../assets/optimized/debutante8.jpeg.webp";
import debutante9 from "../assets/optimized/debutante9.jpeg.webp";
import debutante10 from "../assets/optimized/debutante10.jpeg.webp";
import debutante11 from "../assets/optimized/debutante11.jpeg.webp";
import debutante12 from "../assets/optimized/debutante12.jpeg.webp";
import debutante13 from "../assets/optimized/debutante13.jpeg.webp";
import debutante14 from "../assets/optimized/debutante14.jpeg.webp";
import debutante15 from "../assets/optimized/debutante15.jpeg.webp";
import debutante16 from "../assets/optimized/debutante16.jpeg.webp";
import debutante17 from "../assets/optimized/debutante17.jpeg.webp";

// Fotos novas (pasta fotos, out/2026) — sempre ao final da galeria.
import debutanteNova01 from "../assets/optimized/debutante-nova-01.webp";
import debutanteNova02 from "../assets/optimized/debutante-nova-02.webp";
import debutanteNova03 from "../assets/optimized/debutante-nova-03.webp";
import debutanteNova04 from "../assets/optimized/debutante-nova-04.webp";
import debutanteNova05 from "../assets/optimized/debutante-nova-05.webp";
import debutanteNova06 from "../assets/optimized/debutante-nova-06.webp";
import debutanteNova07 from "../assets/optimized/debutante-nova-07.webp";
import debutanteNova08 from "../assets/optimized/debutante-nova-08.webp";
import debutanteNova09 from "../assets/optimized/debutante-nova-09.webp";
import debutanteNova10 from "../assets/optimized/debutante-nova-10.webp";
import debutanteNova11 from "../assets/optimized/debutante-nova-11.webp";
import debutanteNova12 from "../assets/optimized/debutante-nova-12.webp";
import debutanteNova13 from "../assets/optimized/debutante-nova-13.webp";
import debutanteNova14 from "../assets/optimized/debutante-nova-14.webp";
import debutanteNova15 from "../assets/optimized/debutante-nova-15.webp";
import debutanteNova16 from "../assets/optimized/debutante-nova-16.webp";

type DebutantePhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

// A duração da faixa automática (style.css) foi calibrada para 17 fotos;
// --gallery-scale a estende na mesma proporção para manter a velocidade.
const GALLERY_TIMING_BASE = 17;

const debutantePhotos: DebutantePhoto[] = [
  {
    src: debutante1,
    alt: "Debutante com vestido rosa-pink volumoso, coroa e cachos soltos, sob um arco iluminado",
    width: 609,
    height: 902,
  },
  {
    src: debutante2,
    alt: "Debutante de robe vermelho segurando a coroa nas mãos, com olhos esfumados e boca rosada",
    width: 738,
    height: 1205,
  },
  {
    src: debutante3,
    alt: "Debutante com vestido rosa-claro brilhante em salão decorado com flores e borboletas iluminadas",
    width: 738,
    height: 1166,
  },
  {
    src: debutante4,
    alt: "Debutante com vestido azul-royal de camadas ao lado do bolo azul da festa",
    width: 658,
    height: 1001,
  },
  {
    src: debutante5,
    alt: "Debutante sentada com vestido lilás brilhante e coroa, com um bichinho de pelúcia verde no ombro",
    width: 738,
    height: 1184,
  },
  {
    src: debutante6,
    alt: "Debutante sorrindo com vestido lilás bordado, coroa e cabelos ondulados",
    width: 738,
    height: 1247,
  },
  {
    src: debutante7,
    alt: "Debutante sentada com vestido rosa-claro volumoso no salão da festa, com letreiro iluminado ao fundo",
    width: 683,
    height: 1003,
  },
  {
    src: debutante8,
    alt: "Maquiadora aplicando batom em uma debutante de cabelos cacheados durante a preparação no ateliê",
    width: 590,
    height: 834,
  },
  {
    src: debutante9,
    alt: "Debutante com vestido verde-água bordado com brilhos, coroa e cabelos cacheados soltos",
    width: 1200,
    height: 1600,
  },
  {
    src: debutante10,
    alt: "Debutante de robe vermelho recebendo aplicação de pó com pincel durante a produção",
    width: 738,
    height: 1600,
  },
  {
    src: debutante11,
    alt: "Debutante com vestido azul-marinho volumoso e tiara, sentada sobre a saia armada",
    width: 1134,
    height: 738,
  },
  {
    src: debutante12,
    alt: "Debutante loira com coroa e vestido rosa bordado, apoiada em uma árvore durante ensaio ao ar livre",
    width: 738,
    height: 1209,
  },
  {
    src: debutante13,
    alt: "Debutante com vestido pink bordado e tiara de pérolas, com cabelos cacheados soltos",
    width: 536,
    height: 718,
  },
  {
    src: debutante14,
    alt: "Debutante com vestido dourado de mangas longas bordadas, em salão com lustres de cristal",
    width: 589,
    height: 686,
  },
  {
    src: debutante15,
    alt: "Debutante com vestido rosa brilhante, coroa e cabelos ondulados, pronta no ateliê",
    width: 849,
    height: 1258,
  },
  {
    src: debutante16,
    alt: "Debutante com vestido rosa bordado de brilhos e coroa, olhando por cima do ombro no salão da festa",
    width: 3024,
    height: 4032,
  },
  {
    src: debutante17,
    alt: "Debutante de robe rosa segurando o vestido rosa bordado em um cabide personalizado",
    width: 1290,
    height: 2796,
  },
  {
    src: debutanteNova01,
    alt: "Debutante de vestido branco volumoso e coroa, ao ar livre entre árvores",
    width: 1070,
    height: 1600,
  },
  {
    src: debutanteNova02,
    alt: "Debutante de vestido lilás com brilho diante de um painel de folhagens e flores",
    width: 738,
    height: 1171,
  },
  {
    src: debutanteNova03,
    alt: "Debutante de vestido verde-água bordado sentada com a saia aberta",
    width: 738,
    height: 1074,
  },
  {
    src: debutanteNova04,
    alt: "Debutante de vestido rosé volumoso diante de uma escada iluminada",
    width: 738,
    height: 1022,
  },
  {
    src: debutanteNova05,
    alt: "Debutante de vestido lilás com brilhos e tiara, com as mãos na cintura",
    width: 738,
    height: 1249,
  },
  {
    src: debutanteNova06,
    alt: "Debutante de vestido azul-marinho de mãos dadas com acompanhante, diante da mesa do bolo com balões azuis",
    width: 738,
    height: 804,
  },
  {
    src: debutanteNova07,
    alt: "Debutante de robe rosa segurando o vestido da festa pendurado",
    width: 738,
    height: 1062,
  },
  {
    src: debutanteNova08,
    alt: "Debutante de vestido cinza com brilho e luvas azuis em jardim à noite",
    width: 738,
    height: 935,
  },
  {
    src: debutanteNova09,
    alt: "Debutante de vestido preto com cauda ao lado da mesa do bolo",
    width: 699,
    height: 935,
  },
  {
    src: debutanteNova10,
    alt: "Debutante de vestido rosé vista de costas diante de uma escada com letreiro luminoso",
    width: 738,
    height: 751,
  },
  {
    src: debutanteNova11,
    alt: "Debutante de vestido amarelo e coroa segurando uma rosa vermelha ao ar livre",
    width: 738,
    height: 1048,
  },
  {
    src: debutanteNova12,
    alt: "Debutante de vestido amarelo lendo um jornal temático diante de um palácio",
    width: 661,
    height: 911,
  },
  {
    src: debutanteNova13,
    alt: "Debutante de vestido pink volumoso com luvas e coroa no ateliê",
    width: 913,
    height: 1407,
  },
  {
    src: debutanteNova14,
    alt: "Debutante de vestido lilás com brilho e tiara diante do bolo decorado com flores",
    width: 1064,
    height: 1600,
  },
  {
    src: debutanteNova15,
    alt: "Debutante de vestido rosé volumoso com cauda em cenário de flores cor-de-rosa",
    width: 1066,
    height: 1600,
  },
  {
    src: debutanteNova16,
    alt: "Debutante de robe rosa sentada em cenário de flores cor-de-rosa",
    width: 1066,
    height: 1600,
  },
];
// Foto de destaque da capa: uma das fotos da galeria (debutante9),
// exibida sem nenhuma alteração. Proporção 3:4, igual à moldura em arco:
// aparece inteira, com rosto, coroa e vestido.
const heroPhoto = debutantePhotos.find((photo) => photo.src === debutante9)!;

type DebutantePackage = {
  title: string;
  subtitle: string;
  description: string;
  includes: string[];
  studioPrice?: string;
  homePrice?: string;
  fixedPrice?: string;
  durationMinutes: number;
  highlight?: boolean;
};

// Exportado também para o formulário de agendamento da Home (mesma fonte).
export const packages: DebutantePackage[] = [
  {
    title: "Debutante Bronze",
    subtitle: "Essencial",
    description:
      "Uma produção completa para valorizar cada detalhe desse momento tão especial.",
    includes: [
      "Maquiagem e penteado da debutante",
      "Preparação do penteado com prancha de frisar",
      "Babyliss",
      "Montagem e finalização do penteado",
      "Colocação de vestido, coroa e acessórios",
      "Participação no making off",
    ],
    ...bridalDebutantePriceLabels("bronze"),
    durationMinutes: 180,
  },

  {
    title: "Debutante Prata",
    subtitle: "Experiência",
    description:
      "Uma experiência mais completa, incluindo prévia para definir cada detalhe antes do grande dia.",
    includes: [
      "Prévia de maquiagem e penteado no ateliê",
      "Maquiagem e penteado da debutante",
      "Preparação do penteado com prancha de frisar",
      "Babyliss",
      "Montagem e finalização do penteado",
      "Colocação de vestido, coroa e acessórios",
      "Participação no making off",
    ],
    ...bridalDebutantePriceLabels("prata"),
    durationMinutes: 180,
  },

  {
    title: "Debutante Ouro",
    subtitle: "Experiência Premium",
    description:
      "Uma experiência completa para acompanhar a debutante desde a preparação até os principais momentos da celebração.",
    includes: [
      "Prévia de maquiagem e penteado no ateliê",
      "Maquiagem e penteado da debutante no salão do evento",
      "Preparação do penteado com prancha de frisar",
      "Babyliss",
      "Montagem e finalização do penteado",
      "Permanência no evento para as trocas até a abertura da pista",
      "Produção completa da mãe da debutante",
      "Brinde: maquiagem e babyliss para o ensaio fotográfico",
      "Colocação de vestido, coroa e acessórios",
      "Participação no making off",
    ],
    ...bridalDebutantePriceLabels("ouro"),
    durationMinutes: 600,
    highlight: true,
  },
];

function Debutante() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<
    Record<number, "studio" | "home">
  >({});

  const [bookingData, setBookingData] = useState<{
    service: string;
    location: "studio" | "home";
    price: string;
    durationMinutes: number;
  } | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function togglePackage(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  function selectLocation(index: number, location: "studio" | "home") {
    setSelectedLocation((current) => ({
      ...current,
      [index]: location,
    }));
  }

  return (
    <>
      <SkipLink />

      <ServiceHeader currentPage="debutante" />

      <main className="debutante-page ed-page" id="conteudo" tabIndex={-1}>
        <div className="service-topbar debutante-topbar">
          <Link to="/" className="back-link">
            <span aria-hidden="true">←</span> Voltar para o início
          </Link>
        </div>

        <EditorialHero
          className="debutante-hero"
          photo={heroPhoto}
          particles={DEBUTANTE_HERO_PARTICLES}
          lights={DEBUTANTE_HERO_LIGHTS}
          badge={
            <div className="ed-hero-badge">
              <span>15</span>
              <small>anos</small>
            </div>
          }
        >
          <span className="debutante-eyebrow ed-eyebrow">Produção Debutante</span>

          <h1>
            Um momento único merece
            <span className="ed-accent"> uma produção inesquecível.</span>
          </h1>

          <p>
            A produção de debutante é pensada para valorizar sua personalidade
            e acompanhar a importância desse momento. Cada detalhe é planejado
            com cuidado para que você se sinta linda, confiante e especial do
            início ao fim da celebração.
          </p>

          <a href="#pacotes-debutante" className="debutante-primary-button ed-button">
            Conhecer pacotes
          </a>
        </EditorialHero>

        <EditorialSection
          className="debutante-gallery ed-gallery"
          particles={DEBUTANTE_GALLERY_PARTICLES}
          lights={DEBUTANTE_GALLERY_LIGHTS}
        >
          <div className="debutante-section-heading ed-heading reveal">
            <span className="ed-eyebrow">Momentos especiais</span>

            <h2>Produções de Debutantes</h2>

            <p>
              Uma experiência pensada para acompanhar cada detalhe desse dia.
            </p>
          </div>

          <EditorialGallery
            photos={debutantePhotos}
            label="Fotos de produções de debutantes"
            marqueeClassName="debutante-carousel"
            trackClassName="debutante-carousel-track"
            cardClassName="debutante-carousel-card"
            timingBase={GALLERY_TIMING_BASE}
          />
        </EditorialSection>

        <EditorialSection
          className="debutante-packages ed-packages"
          id="pacotes-debutante"
          particles={DEBUTANTE_PACKAGES_PARTICLES}
          lights={DEBUTANTE_PACKAGES_LIGHTS}
        >
          <div className="debutante-section-heading ed-heading reveal">
            <span className="ed-eyebrow">Escolha sua experiência</span>

            <h2>Pacotes Debutante</h2>

            <p>
              Conheça cada opção e escolha a experiência que mais combina com
              esse momento.
            </p>

            <HelpTipsToggle className="ed-help-toggle" />
          </div>

          <div className="debutante-accordion ed-accordion">
            {packages.map((item, index) => {
              const location = selectedLocation[index];

              const selectedPrice = item.fixedPrice
                ? item.fixedPrice
                : location === "studio"
                  ? item.studioPrice
                  : location === "home"
                    ? item.homePrice
                    : null;

              return (
                <article
                  key={item.title}
                  className={[
                    "debutante-package-item ed-card reveal",
                    item.highlight ? "debutante-gold ed-card-gold" : "",
                    openIndex === index ? "is-open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ "--rd": `${0.2 + index * 0.1}s` } as CSSProperties}
                >
                  <button
                    type="button"
                    className="debutante-package-trigger ed-card-trigger"
                    onClick={() => togglePackage(index)}
                    aria-expanded={openIndex === index}
                    aria-controls={`pacote-debutante-${index}`}
                  >
                    <span className="ed-card-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="ed-card-label">
                      <small className="ed-card-subtitle">{item.subtitle}</small>
                      <span className="ed-card-title">{item.title}</span>
                    </div>

                    <span className="accordion-icon" aria-hidden="true">
                      {openIndex === index ? "−" : "+"}
                    </span>
                  </button>

                  {openIndex === index && (
                    <div className="debutante-package-content ed-card-content" id={`pacote-debutante-${index}`}>
                      <p className="service-description">{item.description}</p>

                      <div className="service-details-grid">
                        <div>
                          <h3>O que inclui</h3>

                          <ul>
                            {item.includes.map((includedItem) => (
                              <li key={includedItem}>{includedItem}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="service-location">
                          {item.fixedPrice ? (
                            <>
                              <h3>Investimento</h3>

                              <div className="selected-price">
                                <span>Pacote Ouro</span>
                                <strong>{item.fixedPrice}</strong>
                              </div>

                              <p className="debutante-duration">
                                Experiência com duração aproximada de 7 a 10
                                horas.
                              </p>
                              <p className="debutante-note">
                                O atendimento deste pacote é realizado no local
                                do evento e inclui acompanhamento durante os
                                principais momentos da produção.
                              </p>

                              <button
                                type="button"
                                className="service-book-button"
                                onClick={() =>
                                  setBookingData({
                                    service: item.title,
                                    location: "home",
                                    price: item.fixedPrice!,
                                    durationMinutes: item.durationMinutes,
                                  })
                                }
                              >
                                Solicitar este pacote
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="a11y-label-row">
                                <h3 id={`local-debutante-${index}`}>Onde deseja ser atendida?</h3>
                                <HelpTip id={`ajuda-local-debutante-${index}`} topic="local do atendimento">
                                  {HELP_TEXTS.location}
                                </HelpTip>
                              </div>

                              <div
                                className="location-buttons"
                                role="group"
                                aria-labelledby={`local-debutante-${index}`}
                                aria-describedby={`ajuda-local-debutante-${index}`}
                              >
                                <button
                                  type="button"
                                  className={
                                    location === "studio"
                                      ? "location-button active"
                                      : "location-button"
                                  }
                                  aria-pressed={location === "studio"}
                                  onClick={() =>
                                    selectLocation(index, "studio")
                                  }
                                >
                                  Ateliê
                                </button>

                                <button
                                  type="button"
                                  className={
                                    location === "home"
                                      ? "location-button active"
                                      : "location-button"
                                  }
                                  aria-pressed={location === "home"}
                                  onClick={() => selectLocation(index, "home")}
                                >
                                  Domicílio
                                </button>
                              </div>

                              <LiveRegion
                                message={
                                  selectedPrice && location
                                    ? `${location === "home" ? "Domicílio" : "Ateliê"}: valor ${selectedPrice}`
                                    : ""
                                }
                              />

                              {selectedPrice && location && (
                                <>
                                  <div className="selected-price">
                                    <span>Valor</span>
                                    <strong>{selectedPrice}</strong>
                                  </div>

                                  <button
                                    type="button"
                                    className="service-book-button"
                                    onClick={() =>
                                      setBookingData({
                                        service: item.title,
                                        location,
                                        price: selectedPrice,
                                        durationMinutes: item.durationMinutes,
                                      })
                                    }
                                  >
                                    Solicitar este pacote
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </EditorialSection>

        {bookingData && (
          <BookingModal
            category="Produção Debutante"
            service={bookingData.service}
            location={bookingData.location}
            price={bookingData.price}
            durationMinutes={bookingData.durationMinutes}
            onClose={() => setBookingData(null)}
          />
        )}
      </main>
    </>
  );
}

export default Debutante;
