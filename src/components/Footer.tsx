import { Link } from "react-router-dom";

import { INSTAGRAM_LINK, WHATSAPP_LINK } from "../config/contact";
import AmbientBackground from "./home/AmbientBackground";
import { FOOTER_LIGHTS, FOOTER_PARTICLES } from "./home/sectionAmbience";

// ambient: fundo animado da Home (a página 404 usa o rodapé sem ele).
function Footer({ ambient = false }: { ambient?: boolean }) {
  return (
    <footer className="footer" id="contato">
      {ambient && <AmbientBackground particles={FOOTER_PARTICLES} lights={FOOTER_LIGHTS} />}

      <div className="footer-brand">
        <h2>Tereza Figueiredo</h2>
        <span>Beauty Artist</span>

        <p>
          Beleza, cuidado e produções personalizadas para momentos especiais.
        </p>
      </div>

      <div className="footer-links">
        <h3>Navegação</h3>

        <a href="#inicio">Início</a>
        <a href="#sobre">Sobre</a>
        <a href="#servicos">Serviços</a>
        <a href="#portfolio">Portfólio</a>
        <a href="#agendamento">Agendamento</a>
      </div>

      <div className="footer-contact">
        <h3>Contato</h3>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp (abre em nova aba)"
        >
          WhatsApp
        </a>

        <a
          href={INSTAGRAM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram @terezafigueiredobeautyartist (abre em nova aba)"
        >
          Instagram
        </a>

        <p>Rio de Janeiro - RJ</p>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Tereza Figueiredo — Beauty Artist. Todos os direitos reservados.</p>

        <p>
          <Link to="/privacidade" className="privacy-link footer-privacy-link">
            Aviso de privacidade
          </Link>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
