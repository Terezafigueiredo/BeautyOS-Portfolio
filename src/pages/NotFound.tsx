import { useEffect } from "react";
import { Link } from "react-router-dom";

import SkipLink from "../components/a11y/SkipLink";
import ServiceHeader from "../components/ServiceHeader";
import Footer from "../components/Footer";

function NotFound() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SkipLink />

      <ServiceHeader />

      <main className="service-page" id="conteudo" tabIndex={-1}>
        <section className="service-page-hero">
          <span className="service-page-eyebrow">Erro 404</span>

          <h1>Essa página não existe.</h1>

          <p>
            O endereço acessado não foi encontrado. Ele pode ter mudado ou
            nunca ter existido. Volte para o início e conheça os serviços de
            Tereza Figueiredo.
          </p>

          <Link to="/" className="primary-button">
            Voltar para o início
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default NotFound;
