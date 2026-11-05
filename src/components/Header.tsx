import { useEffect, useRef, useState } from "react";

import { useActiveSection } from "../hooks/useActiveSection";

const NAV_LINKS = [
  { id: "inicio", label: "Início" },
  { id: "sobre", label: "Sobre" },
  { id: "servicos", label: "Serviços" },
  { id: "portfolio", label: "Portfólio" },
  { id: "agendamento", label: "Contato" },
];

const SECTION_IDS = NAV_LINKS.map((link) => link.id);

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeSection = useActiveSection(SECTION_IDS);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <header className={scrolled ? "header is-scrolled" : "header"}>
      <a
        href="#inicio"
        className="logo"
        aria-label="Tereza Figueiredo Beauty Artist, início"
      >
        <span className="logo-title">
          Tereza <span>Figueiredo</span>
        </span>

        {/* Espaço para o nome lido não virar "FigueiredoBeauty" (WCAG 2.5.3). */}
        {" "}
        <span className="logo-subtitle">Beauty Artist</span>
      </a>

      <button
        type="button"
        className="mobile-menu-button"
        ref={menuButtonRef}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        aria-expanded={menuOpen}
        aria-controls="navegacao-principal"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav
        id="navegacao-principal"
        className={menuOpen ? "nav nav-open" : "nav"}
        aria-label="Navegação principal"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={closeMenu}
            className={activeSection === link.id ? "is-active" : undefined}
            aria-current={activeSection === link.id ? "true" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <a href="#agendamento-formulario" className="schedule-button">
        <span>Agendar</span>
        <span className="schedule-arrow" aria-hidden="true">→</span>
      </a>
    </header>
  );
}

export default Header;
