import { useInView } from "../hooks/useInView";
import AmbientBackground from "./home/AmbientBackground";
import BookingForm from "./home/BookingForm";
import { BOOKING_LIGHTS, BOOKING_PARTICLES } from "./home/sectionAmbience";

function Booking() {
  const { ref, revealed } = useInView<HTMLElement>(0.15);

  return (
    <section
      className={revealed ? "booking is-revealed" : "booking"}
      id="agendamento"
      ref={ref}
    >
      <AmbientBackground particles={BOOKING_PARTICLES} lights={BOOKING_LIGHTS} />

      <div className="booking-content reveal">
        <span className="booking-eyebrow">Agendamento</span>

        <h2>
          Pronta para viver
          <span> sua melhor versão?</span>
        </h2>

        <p>
          Escolha sua produção e entre em contato para consultar
          disponibilidade de data e horário.
        </p>

        <div className="booking-buttons">
          {/* Leva primeiro ao formulário; o WhatsApp só abre ao enviar. */}
          <a href="#agendamento-formulario" className="booking-primary">
            Agendar pelo WhatsApp
          </a>

          <a href="#servicos" className="booking-secondary">
            Ver serviços
          </a>
        </div>
      </div>

      <div className="booking-info reveal">
        <div>
          <span>01</span>
          <h3>Escolha sua produção</h3>
          <p>Social, debutante ou noiva.</p>
        </div>

        <div>
          <span>02</span>
          <h3>Consulte a disponibilidade</h3>
          <p>Informe a data e o horário desejados.</p>
        </div>

        <div>
          <span>03</span>
          <h3>Confirme seu atendimento</h3>
          <p>Após a confirmação, seu horário fica reservado.</p>
        </div>
      </div>

      <BookingForm />
    </section>
  );
}

export default Booking;