import { useEffect, useRef, useState } from "react";

import { getWhatsAppMessageUrl } from "../config/contact";
import { HELP_TEXTS } from "../config/helpTexts";
import HelpTip from "./a11y/HelpTip";
import { buildBookingWhatsappMessage } from "../lib/bookingWhatsappMessage";
import {
  copyText,
  estimateStartTime,
  formatDateBR,
  formatDuration,
  getLocalDateString,
  isPlausiblePhone,
} from "../lib/bookingFormUtils";

// Formulário de SOLICITAÇÃO pelo WhatsApp: nenhum dado é gravado em
// banco (nem no Supabase, nem em outro lugar) e nada é confirmado
// automaticamente — a cliente revisa e envia a mensagem pelo próprio
// WhatsApp, e o agendamento é combinado manualmente.
type BookingModalProps = {
  // Categoria do serviço (ex.: "Produção Social"), incluída na mensagem
  // para diferenciar pacotes com nomes parecidos entre as páginas.
  category: string;
  service: string;
  location: "studio" | "home";
  price: string;
  durationMinutes: number;
  onClose: () => void;
};

type BookingStatus = {
  type: "error" | "success";
  message: string;
};

type ClipboardFeedback = {
  type: "success" | "error";
  message: string;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function BookingModal({
  category,
  service,
  location,
  price,
  durationMinutes,
  onClose,
}: BookingModalProps) {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [readyTime, setReadyTime] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<BookingStatus | null>(null);
  // Campos (ids) com problema na última tentativa: recebem aria-invalid e
  // apontam para a mensagem de erro; o primeiro recebe o foco.
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Mensagem já preparada, pronta para ser enviada pelo WhatsApp ou
  // copiada manualmente. Continua disponível mesmo se o WhatsApp não abrir.
  const [preparedMessage, setPreparedMessage] = useState<string | null>(null);
  const [preparedWhatsappUrl, setPreparedWhatsappUrl] = useState<
    string | null
  >(null);
  const [copyFeedback, setCopyFeedback] =
    useState<ClipboardFeedback | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const locationLabel =
    location === "studio" ? "Ateliê" : "Domicílio";

  const minEventDate = getLocalDateString(new Date());

  // Foco inicial no modal, trava de rolagem da página,
  // ESC para fechar e focus trap para navegação por teclado.
  useEffect(() => {
    previouslyFocusedElement.current =
      document.activeElement as HTMLElement | null;

    modalRef.current?.focus();

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocusedElement.current?.focus?.();
    };
  }, [onClose]);

  function handleOverlayClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  // Qualquer alteração nos dados invalida a solicitação já preparada,
  // para nunca enviar ou copiar uma mensagem desatualizada.
  function resetPreparedState() {
    setPreparedMessage(null);
    setPreparedWhatsappUrl(null);
    setCopyFeedback(null);
    setStatus(null);
    setInvalidFields([]);
  }

  function showError(message: string, fieldIds: string[]) {
    setStatus({ type: "error", message });
    setInvalidFields(fieldIds);
    document.getElementById(fieldIds[0])?.focus();
  }

  const fieldA11y = (fieldId: string, helpId?: string) => {
    const invalid = invalidFields.includes(fieldId);
    return {
      // Sempre explícito: evita "inválido" em campo obrigatório ainda vazio.
      "aria-invalid": invalid,
      "aria-describedby": [helpId, invalid ? "booking-modal-status" : null].filter(Boolean).join(" ") || undefined,
    };
  };

  const estimatedStartTime = estimateStartTime(readyTime, durationMinutes);

  // Valida, monta a mensagem e abre o WhatsApp. Totalmente síncrono (sem
  // await antes do window.open): a abertura acontece dentro do mesmo
  // gesto do clique, o que evita bloqueio de pop-up no celular.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Qualquer nova tentativa começa sem mensagem preparada, para nunca
    // deixar na tela uma mensagem antiga caso esta tentativa falhe.
    setPreparedMessage(null);
    setPreparedWhatsappUrl(null);
    setCopyFeedback(null);
    setStatus(null);
    setInvalidFields([]);

    // "required" no HTML não rejeita campos só com espaços.
    const emptyFields = [
      !name.trim() && "client-name",
      !phone.trim() && "client-phone",
      location === "home" && !address.trim() && "event-address",
    ].filter((field): field is string => Boolean(field));

    if (emptyFields.length > 0) {
      showError("Preencha todos os campos obrigatórios.", emptyFields);
      return;
    }

    if (!isPlausiblePhone(phone)) {
      showError("Informe um WhatsApp válido, com DDD.", ["client-phone"]);
      return;
    }

    const requestedDate = new Date(
      `${eventDate}T${readyTime}`
    );

    const now = new Date();

    if (Number.isNaN(requestedDate.getTime()) || requestedDate <= now) {
      showError("Escolha uma data e horário futuros.", ["event-date", "ready-time"]);
      return;
    }

    if (!estimatedStartTime) {
      showError(
        "O horário informado não é compatível com a duração desse serviço.",
        ["ready-time"]
      );
      return;
    }

    const whatsappMessage = buildBookingWhatsappMessage({
      category,
      service,
      locationLabel,
      price,
      formattedDate: formatDateBR(eventDate),
      readyTime,
      estimatedStartTime,
      durationLabel: formatDuration(durationMinutes),
      name,
      phone,
      address: location === "home" ? address : null,
      notes,
    });

    const whatsappUrl = getWhatsAppMessageUrl(whatsappMessage);

    // A mensagem e os botões ficam visíveis mesmo que o WhatsApp não
    // abra (pop-up bloqueado, WhatsApp não instalado etc.).
    setPreparedMessage(whatsappMessage);
    setPreparedWhatsappUrl(whatsappUrl);

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    setStatus({
      type: "success",
      message:
        "Abrimos o WhatsApp com a sua mensagem: revise e toque em enviar. Se ele não abrir, use os botões abaixo. Seu horário só fica reservado após a confirmação pelo WhatsApp.",
    });
  }

  async function handleCopyMessage() {
    if (!preparedMessage) return;

    const copied = await copyText(preparedMessage);

    setCopyFeedback(
      copied
        ? { type: "success", message: "Mensagem copiada." }
        : {
            type: "error",
            message:
              "Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.",
          }
    );
  }

  return (
    <div
      className="booking-modal-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        ref={modalRef}
        tabIndex={-1}
      >
        <button
          type="button"
          className="booking-modal-close"
          onClick={onClose}
          aria-label="Fechar formulário de agendamento"
        >
          ×
        </button>

        <span className="booking-modal-eyebrow">
          Pré-agendamento
        </span>

        <h2 id="booking-modal-title">
          Solicitar agendamento
        </h2>

        <div className="booking-summary">
          <div>
            <span>Serviço</span>
            <strong>{service}</strong>
          </div>

          <div>
            <span>Atendimento</span>
            <strong>{locationLabel}</strong>
          </div>

          <div>
            <span>Valor</span>
            <strong>{price}</strong>
          </div>
        </div>

        <form
          className="booking-form"
          onSubmit={handleSubmit}
        >
          <div className="booking-field">
            <label htmlFor="client-name">
              Nome
            </label>

            <input
              id="client-name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(event) => {
                resetPreparedState();
                setName(event.target.value);
              }}
              required
              {...fieldA11y("client-name")}
            />
          </div>

          <div className="booking-form-row">
            <div className="booking-field">
              <label htmlFor="event-date">
                Data do evento
              </label>

              <input
                id="event-date"
                type="date"
                value={eventDate}
                min={minEventDate}
                onChange={(event) => {
                  resetPreparedState();
                  setEventDate(event.target.value);
                }}
                required
                {...fieldA11y("event-date")}
              />
            </div>

            <div className="booking-field">
              <div className="a11y-label-row">
                <label htmlFor="ready-time">
                  Preciso estar pronta às
                </label>
                <HelpTip id="booking-help-ready-time" topic="horário em que precisa estar pronta">
                  {HELP_TEXTS.readyTime}
                </HelpTip>
              </div>

              <input
                id="ready-time"
                type="time"
                value={readyTime}
                onChange={(event) => {
                  resetPreparedState();
                  setReadyTime(event.target.value);
                }}
                required
                {...fieldA11y("ready-time", "booking-help-ready-time")}
              />
            </div>
          </div>

          {readyTime && estimatedStartTime && (
            <div className="booking-time-estimate">
              <span>
                Horário estimado para início
              </span>

              <strong>
                {estimatedStartTime}
              </strong>

              <small>
                Duração aproximada:{" "}
                {formatDuration(durationMinutes)}
              </small>
            </div>
          )}

          <div className="booking-field">
            <label htmlFor="client-phone">
              WhatsApp
            </label>

            <input
              id="client-phone"
              type="tel"
              placeholder="(21) 99999-9999"
              value={phone}
              onChange={(event) => {
                resetPreparedState();
                setPhone(event.target.value);
              }}
              required
              {...fieldA11y("client-phone")}
            />
          </div>

          {location === "home" && (
            <div className="booking-field">
              <label htmlFor="event-address">
                Local do atendimento
              </label>

              <input
                id="event-address"
                type="text"
                placeholder="Informe o endereço ou local do evento"
                value={address}
                onChange={(event) => {
                  resetPreparedState();
                  setAddress(event.target.value);
                }}
                required
                {...fieldA11y("event-address")}
              />
            </div>
          )}

          <div className="booking-field">
            <label htmlFor="booking-notes">
              Observações (opcional)
            </label>

            <textarea
              id="booking-notes"
              rows={3}
              placeholder="Alguma informação importante?"
              value={notes}
              onChange={(event) => {
                resetPreparedState();
                setNotes(event.target.value);
              }}
            />
          </div>

          {status && (
            <div
              id="booking-modal-status"
              className={
                status.type === "success"
                  ? "booking-status available"
                  : "booking-status unavailable"
              }
              role={status.type === "error" ? "alert" : "status"}
              aria-live={status.type === "error" ? "assertive" : "polite"}
            >
              <strong>
                {status.type === "success"
                  ? "Mensagem pronta"
                  : "Não foi possível continuar"}
              </strong>

              <p>{status.message}</p>
            </div>
          )}

          {preparedMessage && preparedWhatsappUrl ? (
            <>
              <div className="booking-field">
                <label htmlFor="prepared-message">
                  Mensagem que será enviada
                </label>

                <textarea
                  id="prepared-message"
                  value={preparedMessage}
                  readOnly
                  rows={10}
                />
              </div>

              <div className="booking-prepared-actions">
                <a
                  href={preparedWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="booking-submit-button"
                >
                  Abrir no WhatsApp
                </a>

                <button
                  type="button"
                  className="booking-secondary"
                  onClick={handleCopyMessage}
                >
                  Copiar mensagem
                </button>
              </div>

              {copyFeedback && (
                <p
                  className={
                    copyFeedback.type === "success"
                      ? "booking-copy-feedback success"
                      : "booking-copy-feedback error"
                  }
                  role="status"
                  aria-live="polite"
                >
                  {copyFeedback.message}
                </p>
              )}
            </>
          ) : (
            <button
              type="submit"
              className="booking-submit-button"
            >
              Enviar pelo WhatsApp
            </button>
          )}

          {/* Nova aba: abrir o aviso não fecha o formulário nem apaga os dados. */}
          <p className="booking-privacy-note">
            Saiba como seus dados são usados no{" "}
            <a href="/privacidade" className="privacy-link" target="_blank" rel="noopener">
              Aviso de privacidade<span className="a11y-sr-only"> (abre em nova aba)</span>
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
}

export default BookingModal;
