import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type ServiceHeaderProps = {
  currentPage?: "social" | "debutante" | "noiva";
};

function ServiceHeader({ currentPage }: ServiceHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Esc fecha o menu do celular e devolve o foco ao botão que o abriu.
  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  // Leva ao formulário de agendamento da página inicial, já com a produção
  // desta página selecionada (?producao=...). Usado pelo botão do desktop e
  // pelo item do menu do celular. O próprio formulário também rola até si
  // ao abrir com #agendamento-formulario.
  const bookingHref = currentPage
    ? `/?producao=${currentPage}#agendamento-formulario`
    : "/#agendamento-formulario";

  function goToBooking() {
    closeMenu();

    setTimeout(() => {
      document
        .getElementById("agendamento-formulario")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  return (
    <header className="service-header">
      <div className="service-header-container">
        <Link
          to="/"
          className="service-header-brand"
          aria-label="Tereza Figueiredo Beauty Artist, voltar para a página inicial"
          onClick={closeMenu}
        >
          <span className="service-header-logo">
            Tereza <span>Figueiredo</span>
          </span>

          {/* Espaço para o nome lido não virar "FigueiredoBEAUTY" (WCAG 2.5.3). */}
          {" "}
          <small>BEAUTY ARTIST</small>
        </Link>

        <button
          type="button"
          className="service-mobile-menu-button"
          ref={menuButtonRef}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="navegacao-servicos"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav
          id="navegacao-servicos"
          className={
            menuOpen
              ? "service-header-nav service-header-nav-open"
              : "service-header-nav"
          }
          aria-label="Navegação entre serviços"
        >
          <Link
            to="/social"
            className={currentPage === "social" ? "active" : ""}
            aria-current={currentPage === "social" ? "page" : undefined}
            onClick={closeMenu}
          >
            Social
          </Link>

          <Link
            to="/debutante"
            className={currentPage === "debutante" ? "active" : ""}
            aria-current={currentPage === "debutante" ? "page" : undefined}
            onClick={closeMenu}
          >
            Debutante
          </Link>

          <Link
            to="/noiva"
            className={currentPage === "noiva" ? "active" : ""}
            aria-current={currentPage === "noiva" ? "page" : undefined}
            onClick={closeMenu}
          >
            Noiva
          </Link>

          <Link to="/" className="service-mobile-home" onClick={closeMenu}>
            Início
          </Link>

          <Link
            to={bookingHref}
            className="service-mobile-booking"
            onClick={goToBooking}
          >
            Agendar
          </Link>
        </nav>

        <Link
          to={bookingHref}
          className="service-header-booking"
          onClick={goToBooking}
        >
          {/* nbsp: o botão é flex e descartaria um espaço comum antes da seta. */}
          AGENDAR&nbsp;<span aria-hidden="true">→</span>
        </Link>
      </div>
    </header>
  );
}

export default ServiceHeader;
