import { Link } from "react-router-dom";

import { useInView } from "../hooks/useInView";
import AmbientBackground from "./home/AmbientBackground";
import { PORTFOLIO_LIGHTS, PORTFOLIO_PARTICLES } from "./home/sectionAmbience";

import foto1 from "../assets/optimized/portfolio1.jpeg.webp";
import foto2 from "../assets/optimized/portfolio2.jpeg.webp";
import foto3 from "../assets/optimized/portfolio3.jpeg.webp";

function Portfolio() {
  const { ref, revealed } = useInView<HTMLElement>(0.1);

  return (
    <section
      className={revealed ? "portfolio is-revealed" : "portfolio"}
      id="portfolio"
      ref={ref}
    >
      <AmbientBackground particles={PORTFOLIO_PARTICLES} lights={PORTFOLIO_LIGHTS} />

      <div className="portfolio-heading reveal">


        <h2>Pacotes</h2>

        <p>
          Produções criadas para valorizar a beleza e a personalidade de cada
          cliente.
        </p>
      </div>

      <div className="portfolio-grid">

        {/* PRODUÇÃO SOCIAL */}
        <Link
          to="/social"
          className="portfolio-item reveal"
          aria-label="Conhecer Produção Social"
        >
          <img
            src={foto3}
            alt="Mulher usando vestido roxo em jardim ensolarado, com maquiagem de produção social e cabelos escuros presos"
            width={590}
            height={898}
            loading="lazy"
          />

          <div className="portfolio-overlay">
            <span>Produção Social</span>
          </div>
        </Link>

        {/* PRODUÇÃO DEBUTANTE */}
        <Link
          to="/debutante"
          className="portfolio-item reveal"
          aria-label="Conhecer Produção Debutante"
        >
          <img
            src={foto1}
            alt="Debutante com vestido vermelho brilhante e coroa, posando em escadaria decorada com flores"
            width={590}
            height={748}
            loading="lazy"
          />

          <div className="portfolio-overlay">
            <span>Produção Debutante</span>
          </div>
        </Link>

        {/* PRODUÇÃO NOIVA */}
        <Link
          to="/noiva"
          className="portfolio-item reveal"
          aria-label="Conhecer Produção Noiva"
        >
          <img
            src={foto2}
            alt="Noiva com vestido branco de renda e tule e cabelo preso, sorrindo antes da cerimônia"
            width={960}
            height={1280}
            loading="lazy"
          />

          <div className="portfolio-overlay">
            <span>Produção Noiva</span>
          </div>
        </Link>

      </div>
    </section>
  );
}

export default Portfolio;
