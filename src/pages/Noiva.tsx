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
  NOIVA_GALLERY_LIGHTS,
  NOIVA_GALLERY_PARTICLES,
  NOIVA_HERO_LIGHTS,
  NOIVA_HERO_PARTICLES,
  NOIVA_PACKAGES_LIGHTS,
  NOIVA_PACKAGES_PARTICLES,
} from "../components/editorial/editorialAmbience";
import { HELP_TEXTS } from "../config/helpTexts";
import { bridalDebutantePriceLabels } from "../lib/pricing";
import noiva1 from "../assets/optimized/noiva (1).jpeg.webp";
import noiva2 from "../assets/optimized/noiva (1).jpg.webp";
import noiva3 from "../assets/optimized/noiva (2).jpeg.webp";
import noiva4 from "../assets/optimized/noiva (3).jpeg.webp";
import noiva5 from "../assets/optimized/noiva (4).jpeg.webp";
import noiva6 from "../assets/optimized/noiva (5).jpeg.webp";
import noiva7 from "../assets/optimized/noiva (6).jpeg.webp";
import noiva8 from "../assets/optimized/noiva (7).jpeg.webp";
import noiva9 from "../assets/optimized/noiva (8).jpeg.webp";
import noiva10 from "../assets/optimized/noiva (9).jpeg.webp";
import noiva11 from "../assets/optimized/noiva (10).jpeg.webp";
import noiva12 from "../assets/optimized/noiva (11).jpeg.webp";

// Fotos novas (pasta fotos, out/2026) — sempre ao final da galeria.
import noivaNova01 from "../assets/optimized/noiva-nova-01.webp";
import noivaNova02 from "../assets/optimized/noiva-nova-02.webp";
import noivaNova03 from "../assets/optimized/noiva-nova-03.webp";
import noivaNova04 from "../assets/optimized/noiva-nova-04.webp";
import noivaNova05 from "../assets/optimized/noiva-nova-05.webp";
import noivaNova06 from "../assets/optimized/noiva-nova-06.webp";
import noivaNova07 from "../assets/optimized/noiva-nova-07.webp";
import noivaNova08 from "../assets/optimized/noiva-nova-08.webp";

type BridalPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  // Enquadramento no cartão (object-position) só para fotos que precisam;
  // as demais seguem centralizadas. Não altera o arquivo da foto.
  objectPosition?: string;
};

// A duração da faixa automática (style.css) foi calibrada para 12 fotos;
// --gallery-scale a estende na mesma proporção para manter a velocidade.
const GALLERY_TIMING_BASE = 12;

const bridalGallery: BridalPhoto[] = [
  {
    src: noiva1,
    alt: "Noiva com penteado preso, véu, colar de pérolas e buquê de rosas brancas",
    width: 591,
    height: 668,
  },
  {
    src: noiva2,
    alt: "Noiva com cabelo crespo, arranjo de flores brancas no cabelo e maquiagem iluminada, de perfil em um jardim",
    width: 433,
    height: 576,
  },
  {
    src: noiva3,
    alt: "Noiva loira sorrindo com buquê de rosas cor-de-rosa e brancas, usando vestido branco de um ombro só",
    width: 587,
    height: 928,
  },
  {
    src: noiva4,
    alt: "Noiva com cachos soltos e vestido de renda com mangas de tule, segurando buquê de rosas brancas e flores azuis",
    width: 524,
    height: 687,
  },
  {
    src: noiva5,
    alt: "Noiva com coque, véu longo e vestido tomara que caia, sorrindo de perfil",
    width: 586,
    height: 683,
  },
  {
    src: noiva6,
    alt: "Noiva com coroa e vestido de tule com mangas bufantes, segurando buquê de lírios brancos e flores roxas junto ao tapete vermelho",
    width: 591,
    height: 689,
  },
  {
    src: noiva7,
    alt: "Noiva com vestido branco curto de babados ao lado da mesa de doces decorada com flores brancas",
    width: 591,
    height: 606,
  },
  {
    src: noiva8,
    alt: "Antes e depois de maquiagem e penteado de noiva, com cachos presos em coque, tiara de brilhantes e pele iluminada",
    width: 579,
    height: 575,
  },
  {
    src: noiva9,
    alt: "Noiva rindo ao lado do noivo, segurando buquê de flores cor-de-rosa e brancas",
    width: 526,
    height: 727,
  },
  {
    src: noiva10,
    alt: "Noiva de robe acetinado branco segurando buquê de flores cor-de-rosa, com penteado preso e maquiagem finalizada",
    width: 526,
    height: 642,
  },
  {
    src: noiva11,
    alt: "Noiva com coroa, véu e vestido de tule bordado, segurando buquê de lírios em um jardim de palmeiras",
    width: 960,
    height: 1280,
  },
  {
    src: noiva12,
    alt: "Noiva com vestido branco curto de babados ao lado de um carrinho de sorvete na festa",
    width: 588,
    height: 809,
  },
  {
    src: noivaNova01,
    alt: "Noiva de vestido branco com buquê colorido ao lado de madrinha de vestido roxo",
    width: 1200,
    height: 1600,
  },
  {
    src: noivaNova02,
    alt: "Noiva de vestido de renda e tule segurando buquê colorido, em quarto com poltrona",
    width: 1200,
    height: 1600,
  },
  {
    src: noivaNova03,
    alt: "Close de cílios postiços sendo aplicados com pinça, em luz quente",
    width: 1066,
    height: 1600,
  },
  {
    src: noivaNova04,
    alt: "Close de máscara de cílios sendo aplicada, em luz quente",
    width: 1066,
    height: 1600,
  },
  {
    src: noivaNova05,
    alt: "Noiva de vestido branco e véu ao lado de convidada de vestido magenta, em jardim iluminado",
    width: 506,
    height: 1022,
  },
  {
    src: noivaNova06,
    alt: "Noiva de robe branco e véu sentada na cama com buquê de flores brancas",
    width: 738,
    height: 1420,
    // Foto bem mais alta que o cartão: sobe a janela para mostrar a cabeça e o véu.
    objectPosition: "50% 12%",
  },
  {
    src: noivaNova07,
    alt: "Noiva de robe branco com babados segurando o buquê, em foto vista de cima",
    width: 738,
    height: 927,
  },
  {
    src: noivaNova08,
    alt: "Noiva de véu e cabelo longo ondulado segurando buquê de copos-de-leite",
    width: 1200,
    height: 1600,
  },
];


// Foto de destaque da capa: uma das fotos da galeria (noiva-nova-08),
// exibida sem nenhuma alteração. Proporção 3:4, igual à moldura em arco:
// aparece inteira, com rosto, véu e maquiagem em destaque.
const heroPhoto = bridalGallery.find((photo) => photo.src === noivaNova08)!;

type BridalPackage = {
  title: string;
  subtitle: string;
  description: string;
  includes: string[];
  studioPrice?: string;
  homePrice?: string;
  fixedPrice?: string;
  durationMinutes: number;
  durationLabel: string;
  highlight?: boolean;
};

// Exportado também para o formulário de agendamento da Home (mesma fonte).
export const packages: BridalPackage[] = [
  {
    title: "Noiva Bronze",
    subtitle: "Essencial",
    description:
      "Uma produção completa para o grande dia, com maquiagem e penteado personalizados para valorizar sua beleza e harmonizar com cada detalhe escolhido para o casamento.",
    includes: [
      "Maquiagem da noiva",
      "Penteado da noiva",
      "Preparação do penteado com prancha de frisar",
      "Babyliss",
      "Montagem e finalização do penteado",
      "Colocação do vestido",
      "Colocação de coroa, véu ou grinalda e acessórios",
      "Participação no making of",
    ],
    ...bridalDebutantePriceLabels("bronze"),
    durationMinutes: 180,
    durationLabel: "Aproximadamente 3 horas",
  },

  {
    title: "Noiva Prata",
    subtitle: "Experiência",
    description:
      "Uma experiência mais completa, com prévia de maquiagem e penteado para que cada detalhe da produção seja definido antes do casamento.",
    includes: [
      "Prévia de maquiagem e penteado no ateliê",
      "Maquiagem da noiva no dia do casamento",
      "Penteado da noiva",
      "Preparação do penteado com prancha de frisar",
      "Babyliss",
      "Montagem e finalização do penteado",
      "Colocação do vestido",
      "Colocação de coroa, véu ou grinalda e acessórios",
      "Participação no making of",
    ],
    ...bridalDebutantePriceLabels("prata"),
    durationMinutes: 180,
    durationLabel: "Aproximadamente 3 horas",
  },

  {
    title: "Noiva Ouro",
    subtitle: "Experiência Premium",
    description:
      "Uma experiência completa para acompanhar a noiva desde a preparação até os principais momentos da celebração.",
    includes: [
      "Prévia de maquiagem e penteado no ateliê",
      "Maquiagem e penteado da noiva no salão do evento",
      "Preparação do penteado com prancha de frisar",
      "Babyliss",
      "Montagem e finalização do penteado",
      "Permanência no evento para retoque após a cerimônia, se necessário",
      "Produção completa da mãe da noiva",
      "Brinde: maquiagem para o ensaio fotográfico",
      "Colocação do vestido",
      "Colocação de coroa, véu ou grinalda e acessórios",
      "Participação no making of",
    ],
    ...bridalDebutantePriceLabels("ouro"),
    durationMinutes: 480,
    durationLabel: "Experiência com duração aproximada de 5 a 8 horas",
    highlight: true,
  },
];

function Noiva() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<
    Record<number, "studio" | "home">
  >({});
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [bookingData, setBookingData] = useState<{
    service: string;
    location: "studio" | "home";
    price: string;
    durationMinutes: number;
  } | null>(null);

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

    <ServiceHeader currentPage="noiva" />

    <main className="bride-page ed-page" id="conteudo" tabIndex={-1}>
      <div className="service-topbar bride-topbar">
        <Link to="/" className="back-link">
          <span aria-hidden="true">←</span> Voltar para o início
        </Link>
      </div>

      {/* HERO */}

      <EditorialHero
        className="bride-hero"
        photo={heroPhoto}
        particles={NOIVA_HERO_PARTICLES}
        lights={NOIVA_HERO_LIGHTS}
        badge={
          <div className="ed-hero-badge">
            <span aria-hidden="true">♡</span>

            <small>seu grande dia</small>
          </div>
        }
      >
        <span className="bride-eyebrow ed-eyebrow">Produção Noiva</span>

        <h1>
          Sua beleza,
          <span className="ed-accent"> para um dia inesquecível.</span>
        </h1>

        <p>
          A produção da noiva é pensada para transformar cada detalhe em uma
          experiência especial. Maquiagem, penteado e acabamento são
          planejados de forma personalizada, respeitando seu estilo, sua
          personalidade e tudo o que você imaginou para o grande dia.
        </p>

        <a href="#pacotes-noiva" className="bride-primary-button ed-button">
          Conhecer pacotes
        </a>
      </EditorialHero>

      {/* GALERIA */}

      <EditorialSection
        className="bride-gallery ed-gallery"
        particles={NOIVA_GALLERY_PARTICLES}
        lights={NOIVA_GALLERY_LIGHTS}
      >
        <div className="bride-section-heading ed-heading reveal">
          <span className="ed-eyebrow">Beleza em cada detalhe</span>

          <h2>Produções de Noivas</h2>

          <p>
            Produções pensadas para acompanhar a identidade, o estilo e a
            história de cada noiva.
          </p>
        </div>

        <EditorialGallery
          photos={bridalGallery}
          label="Fotos de produções de noivas"
          marqueeClassName="bride-gallery-marquee"
          trackClassName="bride-gallery-track"
          cardClassName="bride-gallery-card"
          timingBase={GALLERY_TIMING_BASE}
        />
</EditorialSection>

      {/* PACOTES */}

      <EditorialSection
        className="bride-packages ed-packages"
        id="pacotes-noiva"
        particles={NOIVA_PACKAGES_PARTICLES}
        lights={NOIVA_PACKAGES_LIGHTS}
      >
        <div className="bride-section-heading ed-heading reveal">
          <span className="ed-eyebrow">Escolha sua experiência</span>

          <h2>Pacotes para Noivas</h2>

          <p>
            Escolha a experiência que melhor representa o que você deseja viver
            no seu grande dia.
          </p>

          <HelpTipsToggle className="ed-help-toggle" />
        </div>

        <div className="bride-accordion ed-accordion">
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
                  "bride-package-item ed-card reveal",
                  item.highlight ? "bride-gold ed-card-gold" : "",
                  openIndex === index ? "is-open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ "--rd": `${0.2 + index * 0.1}s` } as CSSProperties}
              >
                <button
                  type="button"
                  className="bride-package-trigger ed-card-trigger"
                  onClick={() => togglePackage(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`pacote-noiva-${index}`}
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
                  <div className="bride-package-content ed-card-content" id={`pacote-noiva-${index}`}>
                    <p className="service-description">{item.description}</p>

                    <div className="service-details-grid">
                      <div>
                        <h3>O que inclui</h3>

                        <ul>
                          {item.includes.map((includedItem) => (
                            <li key={includedItem}>{includedItem}</li>
                          ))}
                        </ul>

                        <p className="bride-duration">{item.durationLabel}</p>
                      </div>

                      <div className="service-location">
                        {item.fixedPrice ? (
                          <>
                            <h3>Investimento</h3>

                            <div className="selected-price">
                              <span>Pacote Noiva Ouro</span>

                              <strong>{item.fixedPrice}</strong>
                            </div>

                            <p className="bride-note">
                              Este pacote inclui atendimento no local do evento
                              e acompanhamento durante os principais momentos da
                              produção.
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
                              <h3 id={`local-noiva-${index}`}>Onde deseja ser atendida?</h3>
                              <HelpTip id={`ajuda-local-noiva-${index}`} topic="local do atendimento">
                                {HELP_TEXTS.location}
                              </HelpTip>
                            </div>

                            <div
                              className="location-buttons"
                              role="group"
                              aria-labelledby={`local-noiva-${index}`}
                              aria-describedby={`ajuda-local-noiva-${index}`}
                            >
                              <button
                                type="button"
                                className={
                                  location === "studio"
                                    ? "location-button active"
                                    : "location-button"
                                }
                                aria-pressed={location === "studio"}
                                onClick={() => selectLocation(index, "studio")}
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

      {/* MODAL */}

      {bookingData && (
        <BookingModal
          category="Produção Noiva"
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

export default Noiva;
