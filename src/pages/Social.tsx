import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

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
  SOCIAL_GALLERY_LIGHTS,
  SOCIAL_GALLERY_PARTICLES,
  SOCIAL_HERO_LIGHTS,
  SOCIAL_HERO_PARTICLES,
  SOCIAL_PACKAGES_LIGHTS,
  SOCIAL_PACKAGES_PARTICLES,
} from "../components/social/socialAmbience";
import { HELP_TEXTS } from "../config/helpTexts";
import { formatBRL, socialPriceCents } from "../lib/pricing";

import social1 from "../assets/optimized/portfolio-scroll1.jpg.webp";
import social2 from "../assets/optimized/portfolio-scroll2.jpg.webp";
import social3 from "../assets/optimized/portfolio-scroll3.jpg.webp";
import social4 from "../assets/optimized/portfolio-scroll4.jpg.webp";
import social5 from "../assets/optimized/portfolio-scroll5.jpg.webp";
import social6 from "../assets/optimized/portfolio-scroll6.jpg.webp";
import social7 from "../assets/optimized/portfolio-scroll7.jpg.webp";
import social8 from "../assets/optimized/portfolio-scroll8.jpg.webp";
import social9 from "../assets/optimized/portfolio-scroll9.jpg.webp";

import social10 from "../assets/optimized/portfolio-scroll10.jpeg.webp";
import social12 from "../assets/optimized/portfolio-scroll12.jpeg.webp";
import social13 from "../assets/portfolio-scroll13.jpeg";
import social14 from "../assets/optimized/portfolio-scroll14.jpeg.webp";
import social15 from "../assets/optimized/portfolio-scroll15.jpeg.webp";
import social16 from "../assets/portfolio-scroll16.jpeg";
import social17 from "../assets/optimized/portfolio-scroll17.jpeg.webp";
import social18 from "../assets/optimized/portfolio-scroll18.jpeg.webp";

// Fotos novas (pasta fotos, out/2026) — sempre ao final da galeria.
import socialNova01 from "../assets/optimized/social-nova-01.webp";
import socialNova02 from "../assets/optimized/social-nova-02.webp";
import socialNova03 from "../assets/optimized/social-nova-03.webp";
import socialNova04 from "../assets/optimized/social-nova-04.webp";
import socialNova05 from "../assets/optimized/social-nova-05.webp";
import socialNova06 from "../assets/optimized/social-nova-06.webp";
import socialNova07 from "../assets/optimized/social-nova-07.webp";
import socialNova08 from "../assets/optimized/social-nova-08.webp";
import socialNova09 from "../assets/optimized/social-nova-09.webp";
import socialNova10 from "../assets/optimized/social-nova-10.webp";
import socialNova11 from "../assets/optimized/social-nova-11.webp";
import socialNova12 from "../assets/optimized/social-nova-12.webp";
import socialNova13 from "../assets/optimized/social-nova-13.webp";
import socialNova14 from "../assets/optimized/social-nova-14.webp";
import socialNova15 from "../assets/optimized/social-nova-15.webp";
import socialNova16 from "../assets/optimized/social-nova-16.webp";
import socialNova17 from "../assets/optimized/social-nova-17.webp";
import socialNova18 from "../assets/optimized/social-nova-18.webp";
import socialNova19 from "../assets/optimized/social-nova-19.webp";
import socialNova20 from "../assets/optimized/social-nova-20.webp";
import socialNova21 from "../assets/optimized/social-nova-21.webp";
import socialNova22 from "../assets/optimized/social-nova-22.webp";
import socialNova23 from "../assets/optimized/social-nova-23.webp";
import socialNova24 from "../assets/optimized/social-nova-24.webp";
import socialNova25 from "../assets/optimized/social-nova-25.webp";

type GalleryPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

// A duração da faixa automática (style.css) foi calibrada para 17 fotos;
// --gallery-scale a estende na mesma proporção para manter a velocidade.
const GALLERY_TIMING_BASE = 17;

const socialGallery: GalleryPhoto[] = [
  {
    src: social1,
    alt: "Antes e depois de maquiagem e babyliss: jovem de blusa azul-clara com cabelo liso à esquerda e ondas volumosas com maquiagem à direita",
    width: 1280,
    height: 1280,
  },
  {
    src: social2,
    alt: "Antes e depois de maquiagem social em mulher de cabelo curto escuro, com pele uniformizada e olhos esfumados em tons de bronze",
    width: 1280,
    height: 1280,
  },
  {
    src: social3,
    alt: "Convidada com vestido longo vermelho de um ombro só e cabelos loiros ondulados semipresos",
    width: 960,
    height: 1280,
  },
  {
    src: social4,
    alt: "Madrinha de casamento com vestido longo verde-oliva e bolsa prateada, em salão decorado com flores",
    width: 720,
    height: 1280,
  },
  {
    src: social5,
    alt: "Antes e depois de maquiagem em jovem de camiseta rosa, com cachos definidos, cílios postiços e boca marrom brilhante",
    width: 1280,
    height: 1280,
  },
  {
    src: social6,
    alt: "Cliente com tranças e cachos longos e maquiagem iluminada, sorrindo em frente ao letreiro do ateliê Tereza Figueiredo Beauty Artist",
    width: 960,
    height: 1280,
  },
  {
    src: social7,
    alt: "Antes e depois de maquiagem social: mulher de blusa estampada com pele iluminada, sombra dourada e boca rosada",
    width: 1024,
    height: 1280,
  },
  {
    src: social8,
    alt: "Antes e depois de maquiagem em mulher de cabelos grisalhos, com pele natural, olhos esfumados e boca rosada",
    width: 590,
    height: 571,
  },
  {
    src: social9,
    alt: "Cliente de top branco com cabelos longos ondulados e maquiagem de pele iluminada em ensaio de estúdio",
    width: 413,
    height: 588,
  },
  {
    src: social10,
    alt: "Cliente com uniforme militar azul-marinho e penteado preso, segurando o quepe em frente ao letreiro do ateliê Tereza Figueiredo Beauty Artist",
    width: 4183,
    height: 4370,
  },
  {
    src: social12,
    alt: "Antes e depois de maquiagem em mulher loira de blusa preta, com pele uniformizada, blush marcado e boca rosada",
    width: 1280,
    height: 1280,
  },
  {
    src: social13,
    alt: "Convidada de vestido longo vinho e cabelos escuros ondulados, de costas em uma varanda de madeira cercada de vegetação",
    width: 1280,
    height: 1241,
  },
  {
    src: social14,
    alt: "Convidada com vestido azul acetinado, penteado preso e maquiagem em tons neutros",
    width: 960,
    height: 1280,
  },
  {
    src: social15,
    alt: "Convidada com vestido longo verde-oliva de frente única, em frente à mesa do bolo decorada com flores",
    width: 572,
    height: 728,
  },
  {
    src: social16,
    alt: "Convidada com vestido longo lilás bordado e cabelo preso, em frente a uma árvore decorada com flores brancas",
    width: 590,
    height: 1280,
  },
  {
    src: social17,
    alt: "Aniversariante de vestido verde-escuro atrás do bolo de aniversário, em festa decorada com balões verdes e dourados",
    width: 589,
    height: 648,
  },
  {
    src: social18,
    alt: "Cliente com blazer preto e camisa branca e maquiagem em tons neutros, em ensaio fotográfico de estúdio",
    width: 1290,
    height: 2796,
  },
  {
    src: socialNova01,
    alt: "Gestante em ensaio fotográfico com vestido preto de mangas bufantes e cabelo preso",
    width: 1124,
    height: 1531,
  },
  {
    src: socialNova02,
    alt: "Mulher de blusa branca com cabelo longo ondulado e maquiagem iluminada",
    width: 436,
    height: 805,
  },
  {
    src: socialNova03,
    alt: "Convidada de top branco e calça preta em salão de festas, com bolsa preta",
    width: 738,
    height: 1088,
  },
  {
    src: socialNova04,
    alt: "Perfil de mulher com cabelos cacheados presos e brinco dourado",
    width: 738,
    height: 881,
  },
  {
    src: socialNova05,
    alt: "Formanda de uniforme de gala azul-marinho segurando um buquê de girassóis",
    width: 738,
    height: 929,
  },
  {
    src: socialNova06,
    alt: "Mulher de vestido longo vermelho rendado em salão de eventos",
    width: 1204,
    height: 1600,
  },
  {
    src: socialNova07,
    alt: "Três madrinhas de vestidos vermelhos posando diante de um painel de flores",
    width: 738,
    height: 1143,
  },
  {
    src: socialNova08,
    alt: "Mulher sorridente de vestido vermelho, cabelo escuro e franja",
    width: 738,
    height: 1241,
  },
  {
    src: socialNova09,
    alt: "Mulher de vestido preto curto sentada em um sofá de couro caramelo",
    width: 738,
    height: 882,
  },
  {
    src: socialNova10,
    alt: "Convidada de vestido longo vermelho ao lado da mesa de doces de uma festa",
    width: 738,
    height: 785,
  },
  {
    src: socialNova11,
    alt: "Mulher de vestido verde de paetês sentada em um balanço decorado com flores",
    width: 738,
    height: 938,
  },
  {
    src: socialNova12,
    alt: "Mulher de vestido preto e cabelo ondulado acobreado, ao lado de velas",
    width: 738,
    height: 1095,
  },
  {
    src: socialNova13,
    alt: "Duas convidadas de vestidos verde e preto de paetês em uma festa",
    width: 738,
    height: 1004,
  },
  {
    src: socialNova14,
    alt: "Mulher de cabelos cacheados e blusa caramelo sorrindo em fundo neutro",
    width: 738,
    height: 1076,
  },
  {
    src: socialNova15,
    alt: "Mulher de cabelo curto ondulado e vestido verde-oliva com babados",
    width: 900,
    height: 1600,
  },
  {
    src: socialNova16,
    alt: "Mulher de vestido verde-escuro e cabelo preso sorrindo em casa",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova17,
    alt: "Mulher de vestido e capa magenta diante da mesa do bolo, sob lustres",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova18,
    alt: "Penteado preso com cachos visto de costas, em cliente de robe de cetim escrito Mãe da Noiva",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova19,
    alt: "Jovem de cabelo longo ondulado e jaqueta marrom no ateliê",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova20,
    alt: "Mulher de robe preto com cabelo preso e maquiagem suave",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova21,
    alt: "Cliente de camisa listrada sorrindo diante do painel do ateliê Tereza Figueiredo",
    width: 1200,
    height: 1124,
  },
  {
    src: socialNova22,
    alt: "Mulher de vestido estampado vermelho e branco na varanda de um apartamento",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova23,
    alt: "Formanda de uniforme de gala azul-marinho em evento noturno ao ar livre",
    width: 1066,
    height: 1600,
  },
  {
    src: socialNova24,
    alt: "Mulher de vestido longo prateado com fenda em um corredor",
    width: 1200,
    height: 1600,
  },
  {
    src: socialNova25,
    alt: "Mulher de vestido preto curto e salto alto em salão com arcos e lustre",
    width: 738,
    height: 843,
  },
];

// Foto de destaque da capa: uma das fotos da galeria (social-nova-17),
// exibida sem nenhuma alteração. Proporção 3:4, igual à moldura em arco,
// então aparece inteira — o rosto fica longe das bordas.
const heroPhoto = socialGallery.find((photo) => photo.src === socialNova17)!;
type ServiceItem = {
  title: string;
  description: string;
  includes: string[];
  // Único valor cadastrado: preço no ATELIÊ, em centavos. O valor a
  // domicílio é sempre derivado (socialPriceCents, em src/lib/pricing.ts).
  studioPriceCents: number;
  durationMinutes: number;
};
// Exportado também para o formulário de agendamento da Home (mesma fonte).
export const services: ServiceItem[] = [
  {
    title: "Maquiagem Social",
    description:
      "Maquiagem profissional personalizada para a ocasião, pensada para valorizar seus traços e proporcionar um acabamento elegante e duradouro.",
    includes: [
      "Preparação da pele",
      "Maquiagem completa",
      "Cílios",
      "Finalização",
    ],
    studioPriceCents: 200_00,
    durationMinutes: 60,
  },

  {
    title: "Maquiagem + Babyliss",
    description:
      "Produção com maquiagem profissional e finalização dos cabelos com babyliss.",
    includes: [
      "Maquiagem completa",
      "Cílios",
      "Preparação com prancha de frisar para a fixação",
      "Babyliss",
      "Finalização",
    ],
    studioPriceCents: 300_00,
    durationMinutes: 120,
  },

  {
    title: "Maquiagem + Penteado",
    description:
      "Produção completa para eventos e ocasiões especiais, unindo maquiagem e penteado em uma única experiência.",
    includes: [
      "Maquiagem completa",
      "Cílios",
      "Preparação com prancha de frisar para o penteado",
      "Babyliss",
      "Montagem e finalização do penteado",
    ],
    studioPriceCents: 350_00,
    durationMinutes: 180,
  },

  {
    title: "Babyliss",
    description:
      "Modelagem dos cabelos com babyliss, ideal para quem deseja ondas, movimento e uma finalização elegante.",
    includes: [
      "Preparação dos cabelos",
      "Modelagem com babyliss",
      "Finalização",
    ],
    studioPriceCents: 100_00,
    durationMinutes: 60,
  },

  {
    title: "Penteado",
    description:
      "Penteado personalizado de acordo com o estilo, evento e referência escolhida.",
    includes: [
      "Preparação com prancha de frisar para o penteado",
      "Babyliss",
      "Montagem e finalização do penteado",
    ],
    studioPriceCents: 150_00,
    durationMinutes: 90,
  },

  {
    title: "Produção Infantil",
    description:
      "Produção delicada e adequada para crianças, pensada especialmente para festas e ocasiões especiais.",
    includes: [
      "Sombra, rímel, blush e batom",
      "Preparação com prancha de frisar para o penteado",
      "Babyliss",
      "Montagem e finalização do penteado",
    ],
    studioPriceCents: 150_00,
    durationMinutes: 90,
  },
];

function Social() {
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

  function toggleService(index: number) {
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

      <ServiceHeader currentPage="social" />

      <main className="service-page ed-page" id="conteudo" tabIndex={-1}>
        <EditorialHero
          className="service-page-hero"
          photo={heroPhoto}
          particles={SOCIAL_HERO_PARTICLES}
          lights={SOCIAL_HERO_LIGHTS}
        >
          <span className="service-page-eyebrow ed-eyebrow">Produção Social</span>

          <h1>
            Uma produção para cada{" "}
            <span className="ed-accent">momento especial.</span>
          </h1>

          <p>
            A Produção Social é pensada para mulheres que desejam uma maquiagem
            profissional e personalizada para momentos especiais. Atendo
            madrinhas, convidadas de casamento, casamentos no civil,
            aniversariantes, formandas, ensaios fotográficos, festas e outros
            eventos.
          </p>

          <p>
            Cada produção é criada de acordo com a ocasião, seu estilo e suas
            preferências, valorizando seus traços e garantindo um resultado
            elegante, harmonioso e pensado especialmente para você.
          </p>

          <a href="#galeria" className="primary-button ed-button">
            Ver trabalhos
          </a>
        </EditorialHero>

        <EditorialSection
          className="service-gallery ed-gallery"
          id="galeria"
          particles={SOCIAL_GALLERY_PARTICLES}
          lights={SOCIAL_GALLERY_LIGHTS}
        >
          <div className="service-gallery-heading ed-heading reveal">
            <span className="service-page-eyebrow ed-eyebrow">Galeria</span>

            <h2>Produções Sociais</h2>

            <p>
              Alguns trabalhos realizados para diferentes ocasiões e estilos.
            </p>
          </div>

          <EditorialGallery
            photos={socialGallery}
            label="Fotos de produções sociais"
            marqueeClassName="social-gallery-marquee"
            trackClassName="social-gallery-track"
            cardClassName="social-gallery-card"
            timingBase={GALLERY_TIMING_BASE}
          />
        </EditorialSection>

        <EditorialSection
          className="service-packages ed-packages"
          id="pacotes"
          particles={SOCIAL_PACKAGES_PARTICLES}
          lights={SOCIAL_PACKAGES_LIGHTS}
        >
          <span className="service-page-eyebrow ed-eyebrow reveal">Escolha seu serviço</span>

          <h2 className="reveal" style={{ "--rd": "0.08s" } as CSSProperties}>
            Pacotes de Produção Social
          </h2>

          <p className="reveal" style={{ "--rd": "0.16s" } as CSSProperties}>
            Clique em uma opção para conhecer os detalhes, o que está incluso e
            escolher onde deseja ser atendida.
          </p>

          <HelpTipsToggle className="ed-help-toggle reveal" />

          <div className="service-accordion ed-accordion">
            {services.map((service, index) => {
              const location = selectedLocation[index];

              const selectedPrice = location
                ? formatBRL(socialPriceCents(service.studioPriceCents, location))
                : null;

              return (
                <article
                  className={
                    openIndex === index
                      ? "service-accordion-item ed-card reveal is-open"
                      : "service-accordion-item ed-card reveal"
                  }
                  key={service.title}
                  style={{ "--rd": `${0.22 + index * 0.08}s` } as CSSProperties}
                >
                  <button
                    type="button"
                    className="service-accordion-trigger ed-card-trigger"
                    onClick={() => toggleService(index)}
                    aria-expanded={openIndex === index}
                    aria-controls={`servico-social-${index}`}
                  >
                    <span className="ed-card-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="ed-card-title">{service.title}</span>

                    <span className="accordion-icon" aria-hidden="true">
                      {openIndex === index ? "−" : "+"}
                    </span>
                  </button>

                  {openIndex === index && (
                    <div className="service-accordion-content ed-card-content" id={`servico-social-${index}`}>
                      <p className="service-description">
                        {service.description}
                      </p>

                      <div className="service-details-grid">
                        <div>
                          <h3>O que inclui</h3>

                          <ul>
                            {service.includes.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="service-location">
                          <div className="a11y-label-row">
                            <h3 id={`local-social-${index}`}>Onde deseja ser atendida?</h3>
                            <HelpTip id={`ajuda-local-social-${index}`} topic="local do atendimento">
                              {HELP_TEXTS.location}
                            </HelpTip>
                          </div>

                          <div
                            className="location-buttons"
                            role="group"
                            aria-labelledby={`local-social-${index}`}
                            aria-describedby={`ajuda-local-social-${index}`}
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
                              selectedPrice
                                ? `${location === "home" ? "Domicílio" : "Ateliê"}: valor ${selectedPrice}`
                                : ""
                            }
                          />

                          {selectedPrice && (
                            <div className="selected-price">
                              <span>Valor</span>

                              <strong>{selectedPrice}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedPrice && location && (
                        <button
                          type="button"
                          className="service-book-button"
                          onClick={() =>
                            setBookingData({
                              service: service.title,
                              location,
                              price: selectedPrice,
                              durationMinutes: service.durationMinutes,
                            })
                          }
                        >
                          Agendar este serviço
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </EditorialSection>

        {bookingData && (
          <BookingModal
            category="Produção Social"
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

export default Social;
