import { Routes, Route } from "react-router-dom";

import SkipLink from "./components/a11y/SkipLink";
import Header from "./components/Header";
import Hero from "./components/home/Hero";
import FloatingWhatsApp from "./components/home/FloatingWhatsApp";
import Services from "./components/Services";
import About from "./components/About";
import Portfolio from "./components/Portfolio";
import Testimonials from "./components/Testimonials";
import Booking from "./components/Booking";
import Footer from "./components/Footer";
import Debutante from "./pages/Debutante";
import Noiva from "./pages/Noiva";
import Social from "./pages/Social";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";

function Home() {
  // .home-page delimita o visual novo da Home: o mesmo Footer, por exemplo,
  // continua com o estilo original na página 404.
  return (
    <div className="home-page">
      <SkipLink />

      <Header />

      <main id="conteudo" tabIndex={-1}>
        <Hero />

        <About />

        <Services />

        <Portfolio />

        <Testimonials />

        <Booking />
      </main>

      <Footer ambient />

      <FloatingWhatsApp />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/social" element={<Social />} />

      <Route path="/debutante" element={<Debutante />} />

      <Route path="/noiva" element={<Noiva />} />

      <Route path="/privacidade" element={<Privacy />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;