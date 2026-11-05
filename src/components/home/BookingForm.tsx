import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "react-router-dom";

import { WHATSAPP_NUMBER, getWhatsAppMessageUrl } from "../../config/contact";
import { HELP_TEXTS } from "../../config/helpTexts";
import HelpTip from "../a11y/HelpTip";
import HelpTipsToggle from "../a11y/HelpTipsToggle";
import LiveRegion from "../a11y/LiveRegion";
import { copyText, formatDateBR, getLocalDateString, isPlausiblePhone } from "../../lib/bookingFormUtils";
import type { ServiceLocation } from "../../lib/pricing";
import { buildBookingWhatsappMessage } from "../../lib/bookingWhatsappMessage";
import {
  BOOKING_OPTIONS,
  LOCATION_LABELS,
  PRODUCTION_GROUPS,
  isProductionGroup,
} from "./bookingOptions";
import type { ProductionGroup } from "./bookingOptions";

// Formulário de SOLICITAÇÃO de agendamento da Home. Nada é gravado (sem
// banco, sem localStorage, sem serviço externo): os dados ficam só na
// memória da página. "Enviar pelo WhatsApp" valida e mostra uma confirmação
// curta; o WhatsApp só abre em "Confirmar e abrir WhatsApp", e o envio de
// fato acontece quando a cliente confirma dentro do próprio WhatsApp.
//
// Pré-seleção pela URL (vinda das páginas de serviço):
//   /?producao=social#agendamento-formulario   → tipo de produção
//   /?servico=noiva-ouro#agendamento-formulario → serviço/pacote exato

type FieldName = "name" | "phone" | "group" | "option" | "location" | "address" | "eventDate" | "readyTime";

type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ["name", "phone", "group", "option", "location", "address", "eventDate", "readyTime"];

// Elemento que recebe o foco quando o campo tem erro.
const FIELD_FOCUS_ID: Record<FieldName, string> = {
  name: "bf-name",
  phone: "bf-phone",
  group: "bf-group",
  option: "bf-option",
  location: "bf-location-studio",
  address: "bf-address",
  eventDate: "bf-event-date",
  readyTime: "bf-ready-time",
};

// Depois de abrir o WhatsApp: "opened" quando a página perdeu o foco (a aba
// ou o app do WhatsApp abriu); "unconfirmed" quando nada aconteceu — aí, e
// só aí, oferecemos copiar a mensagem.
type SendResult = { status: "opened" } | { status: "unconfirmed"; message: string };

// Tempo para perceber se o WhatsApp abriu (a página perde o foco ou fica oculta).
const OPEN_DETECTION_MS = 1500;

// "5521998730052" → "(21) 99873-0052", para a cliente colar a mensagem.
const STUDIO_WHATSAPP_LABEL = WHATSAPP_NUMBER.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

function readPreselection(search: string) {
  const params = new URLSearchParams(search);
  const option = BOOKING_OPTIONS.find((item) => item.id === params.get("servico"));

  if (option) {
    return {
      group: option.group,
      optionId: option.id,
      location: option.locations.length === 1 ? option.locations[0] : null,
    };
  }

  const group = params.get("producao");

  if (isProductionGroup(group)) {
    return { group, optionId: group === "outro" ? "outro" : "", location: null };
  }

  return { group: "" as const, optionId: "", location: null };
}

function BookingForm() {
  const routerLocation = useLocation();
  const [initial] = useState(() => readPreselection(routerLocation.search));

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState<ProductionGroup | "">(initial.group);
  const [optionId, setOptionId] = useState(initial.optionId);
  const [location, setLocation] = useState<ServiceLocation | null>(initial.location);
  const [address, setAddress] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [readyTime, setReadyTime] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ copied: boolean; text: string } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Trava curta contra clique duplo: no máximo uma abertura do WhatsApp por envio.
  const sendLockRef = useRef(false);
  const stopDetectionRef = useRef<(() => void) | null>(null);

  const option = BOOKING_OPTIONS.find((item) => item.id === optionId) ?? null;
  const groupOptions = BOOKING_OPTIONS.filter((item) => item.group === group);
  const price = option && location ? option.priceFor(location) : null;
  const minDate = getLocalDateString(new Date());

  // Chegando com #agendamento-formulario (botões da Home ou das páginas de
  // serviço), rola até o formulário depois que a página monta.
  useEffect(() => {
    if (routerLocation.hash !== "#agendamento-formulario") return;

    const frame = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "start" });
    });

    return () => cancelAnimationFrame(frame);
  }, [routerLocation.hash, routerLocation.key]);

  useEffect(() => () => stopDetectionRef.current?.(), []);

  // Qualquer alteração descarta o resultado do envio anterior e o erro do campo.
  function touched(field?: FieldName) {
    stopDetectionRef.current?.();
    setSendResult(null);
    setCopyFeedback(null);
    if (field) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeGroup(value: ProductionGroup | "") {
    touched("group");
    setGroup(value);
    setOptionId(value === "outro" ? "outro" : "");
    setLocation(null);
    setErrors((current) => ({ ...current, option: undefined, location: undefined }));
  }

  function changeOption(value: string) {
    touched("option");
    setOptionId(value);

    const next = BOOKING_OPTIONS.find((item) => item.id === value);
    if (!next) return;

    if (next.locations.length === 1) {
      setLocation(next.locations[0]);
    } else if (location && !next.locations.includes(location)) {
      setLocation(null);
    }
  }

  function validate(): FieldErrors {
    const found: FieldErrors = {};

    if (!name.trim()) found.name = "Informe seu nome.";
    if (phone.trim() && !isPlausiblePhone(phone)) found.phone = "Informe um WhatsApp válido, com DDD.";
    if (!group) found.group = "Escolha o tipo de produção.";
    if (group && !option) found.option = "Escolha o serviço ou pacote.";

    if (!location) {
      found.location = "Escolha onde deseja ser atendida.";
    } else if (option && !option.locations.includes(location)) {
      found.location = "Este pacote é realizado somente no local do evento.";
    }

    if (location === "home" && !address.trim()) {
      found.address = "Informe o endereço ou bairro da produção.";
    }

    if (!eventDate) {
      found.eventDate = "Informe a data do evento.";
    } else if (eventDate < minDate) {
      found.eventDate = "Escolha uma data a partir de hoje.";
    }

    if (!readyTime) {
      found.readyTime = "Informe o horário em que precisa estar pronta.";
    } else if (eventDate && !found.eventDate && new Date(`${eventDate}T${readyTime}`) <= new Date()) {
      found.readyTime = "Esse horário já passou. Escolha um horário futuro.";
    }

    return found;
  }

  // "Enviar pelo WhatsApp": valida e, se estiver tudo certo, abre a
  // confirmação. Com erros, destaca os campos e foca o primeiro.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate();
    setErrors(found);

    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_FOCUS_ID[firstInvalid])?.focus();
      return;
    }

    touched();
    dialogRef.current?.showModal();
  }

  function buildMessage() {
    if (!option || !location) return null;

    return buildBookingWhatsappMessage({
      category: option.category,
      service: option.service,
      locationLabel: LOCATION_LABELS[location],
      price,
      formattedDate: formatDateBR(eventDate),
      readyTime,
      name,
      phone,
      address: location === "home" ? address : null,
      notes,
    });
  }

  // Observa se a página perde o foco ou fica oculta logo após a abertura —
  // sinal de que a aba ou o app do WhatsApp abriu. (Com "noreferrer" o
  // navegador não devolve a janela aberta, então não há outra forma de saber.)
  function watchWhatsappOpening(message: string) {
    stopDetectionRef.current?.();

    const opened = () => {
      stop();
      setSendResult({ status: "opened" });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") opened();
    };
    const timer = window.setTimeout(() => {
      stop();
      setSendResult({ status: "unconfirmed", message });
    }, OPEN_DETECTION_MS);

    function stop() {
      window.clearTimeout(timer);
      window.removeEventListener("blur", opened);
      document.removeEventListener("visibilitychange", onVisibility);
      stopDetectionRef.current = null;
    }

    window.addEventListener("blur", opened);
    document.addEventListener("visibilitychange", onVisibility);
    stopDetectionRef.current = stop;
  }

  // Síncrono, dentro do clique (sem await antes do window.open), para o
  // celular não bloquear a abertura do WhatsApp.
  function handleConfirm() {
    if (sendLockRef.current) return;

    const found = validate();
    if (Object.keys(found).length > 0) {
      dialogRef.current?.close();
      setErrors(found);
      const firstInvalid = FIELD_ORDER.find((field) => found[field]);
      if (firstInvalid) document.getElementById(FIELD_FOCUS_ID[firstInvalid])?.focus();
      return;
    }

    const message = buildMessage();
    if (!message) return;

    sendLockRef.current = true;
    window.setTimeout(() => {
      sendLockRef.current = false;
    }, 2000);

    setCopyFeedback(null);
    dialogRef.current?.close();

    // noopener: o WhatsApp não controla esta página; noreferrer: o endereço
    // do site não é enviado ao WhatsApp.
    window.open(getWhatsAppMessageUrl(message), "_blank", "noopener,noreferrer");
    watchWhatsappOpening(message);
  }

  function handleCorrect() {
    dialogRef.current?.close();
    document.getElementById("bf-name")?.focus();
  }

  async function handleCopy() {
    if (sendResult?.status !== "unconfirmed") return;
    const copied = await copyText(sendResult.message);
    setCopyFeedback(
      copied
        ? { copied, text: `Mensagem copiada. Cole no WhatsApp ${STUDIO_WHATSAPP_LABEL}.` }
        : { copied, text: "Não foi possível copiar automaticamente. Selecione o texto abaixo e copie." },
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  // Junta os ids de descrição presentes (ajuda, dica, erro) para o
  // aria-describedby; undefined quando não há nenhum.
  const describedBy = (...ids: (string | false | null | undefined)[]) =>
    ids.filter(Boolean).join(" ") || undefined;

  // Props comuns de acessibilidade para um campo com possível erro e,
  // opcionalmente, uma explicação de ajuda (HelpTip). aria-invalid é sempre
  // explícito: sem ele, o Chrome marca como "inválido" um campo obrigatório
  // ainda vazio, e o leitor de tela anunciaria erro antes de qualquer envio.
  const fieldA11y = (field: FieldName, helpId?: string) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": describedBy(helpId, errors[field] && `bf-error-${field}`),
  });

  const singleLocationOption = Boolean(option && option.locations.length === 1);

  const fieldError = (field: FieldName) =>
    errors[field] ? (
      <p className="bf-error" id={`bf-error-${field}`}>
        {errors[field]}
      </p>
    ) : null;

  const confirmRows: [string, string][] =
    option && location
      ? [
          ["Nome", name.trim()],
          ["Serviço", option.group === "outro" ? option.service : `${option.category} · ${option.service}`],
          ["Local", location === "home" ? `${LOCATION_LABELS.home} · ${address.trim()}` : LOCATION_LABELS.studio],
          ["Data do evento", formatDateBR(eventDate)],
          ["Pronta às", readyTime],
          ...(price ? ([["Valor", price]] as [string, string][]) : []),
        ]
      : [];

  return (
    <div className="bf-panel reveal" id="agendamento-formulario" ref={panelRef}>
      <div className="bf-heading">
        <span className="bf-eyebrow">Solicitação de agendamento</span>
        <h3>Conte para mim sobre o seu momento</h3>
        <p>
          Preencha os dados abaixo. Antes de abrir o WhatsApp, você confere um
          resumo, e a mensagem só é enviada quando você confirmar por lá.
        </p>

        <HelpTipsToggle className="bf-help-toggle" />
      </div>

      <form className="bf-form" onSubmit={handleSubmit} noValidate>
        {errorCount > 0 && (
          <div className="bf-alert" role="alert">
            {errorCount === 1
              ? "Revise o campo destacado abaixo."
              : `Revise os ${errorCount} campos destacados abaixo.`}
          </div>
        )}

        <div className="bf-grid bf-grid-2">
          <div className="bf-field">
            <label htmlFor="bf-name">
              Nome <span className="bf-required" aria-hidden="true">*</span>
            </label>
            <input
              id="bf-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                touched("name");
                setName(event.target.value);
              }}
              required
              {...fieldA11y("name")}
            />
            {fieldError("name")}
          </div>

          <div className="bf-field">
            <div className="a11y-label-row">
              <label htmlFor="bf-phone">
                WhatsApp <span className="bf-optional">(opcional)</span>
              </label>
              <HelpTip id="bf-help-phone" topic="WhatsApp">
                {HELP_TEXTS.phone}
              </HelpTip>
            </div>
            <input
              id="bf-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="(21) 99999-9999"
              value={phone}
              onChange={(event) => {
                touched("phone");
                setPhone(event.target.value);
              }}
              {...fieldA11y("phone", "bf-help-phone")}
            />
            {fieldError("phone")}
          </div>
        </div>

        <div className="bf-grid bf-grid-2">
          <div className="bf-field">
            <label htmlFor="bf-group">
              Tipo de produção <span className="bf-required" aria-hidden="true">*</span>
            </label>
            <select
              id="bf-group"
              value={group}
              onChange={(event) => changeGroup(event.target.value as ProductionGroup | "")}
              required
              {...fieldA11y("group")}
            >
              <option value="">Selecione</option>
              {PRODUCTION_GROUPS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {fieldError("group")}
          </div>

          {group && group !== "outro" && (
            <div className="bf-field">
              <label htmlFor="bf-option">
                Serviço ou pacote <span className="bf-required" aria-hidden="true">*</span>
              </label>
              <select
                id="bf-option"
                value={optionId}
                onChange={(event) => changeOption(event.target.value)}
                required
                {...fieldA11y("option")}
              >
                <option value="">Selecione</option>
                {groupOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.service}
                  </option>
                ))}
              </select>
              {fieldError("option")}
            </div>
          )}
        </div>

        {/* O nome do grupo vem só do texto da legenda (aria-labelledby), sem o
            botão de ajuda que fica ao lado dele. */}
        <fieldset
          className="bf-fieldset"
          aria-labelledby="bf-location-label"
          aria-describedby={describedBy(
            "bf-help-location",
            singleLocationOption && "bf-hint-location",
            errors.location && "bf-error-location",
          )}
        >
          <legend className="a11y-label-row">
            <span id="bf-location-label">
              Local do atendimento <span className="bf-required" aria-hidden="true">*</span>
            </span>
            <HelpTip id="bf-help-location" topic="Local do atendimento">
              {HELP_TEXTS.location}
            </HelpTip>
          </legend>

          <div className="bf-choices">
            {(["studio", "home"] as const).map((value) => {
              const allowed = !option || option.locations.includes(value);
              return (
                <label key={value} className="bf-choice">
                  <input
                    type="radio"
                    id={`bf-location-${value}`}
                    name="bf-location"
                    value={value}
                    checked={location === value}
                    disabled={!allowed}
                    required
                    aria-invalid={Boolean(errors.location)}
                    onChange={() => {
                      touched("location");
                      setLocation(value);
                      if (value === "studio") setErrors((current) => ({ ...current, address: undefined }));
                    }}
                  />
                  <span>{LOCATION_LABELS[value]}</span>
                </label>
              );
            })}
          </div>

          {singleLocationOption && (
            <p className="bf-hint" id="bf-hint-location">
              Este pacote é realizado no local do evento.
            </p>
          )}
          {fieldError("location")}

          {price && (
            <p className="bf-price">
              Valor deste serviço: <strong>{price}</strong>
            </p>
          )}

          <LiveRegion message={price ? `Valor deste serviço: ${price}` : ""} />
        </fieldset>

        {location === "home" && (
          <div className="bf-field">
            <label htmlFor="bf-address">
              Endereço ou bairro da produção <span className="bf-required" aria-hidden="true">*</span>
            </label>
            <input
              id="bf-address"
              type="text"
              autoComplete="street-address"
              value={address}
              onChange={(event) => {
                touched("address");
                setAddress(event.target.value);
              }}
              required
              {...fieldA11y("address")}
            />
            {fieldError("address")}
          </div>
        )}

        <div className="bf-grid bf-grid-2">
          <div className="bf-field">
            <label htmlFor="bf-event-date">
              Data do evento <span className="bf-required" aria-hidden="true">*</span>
            </label>
            <input
              id="bf-event-date"
              type="date"
              min={minDate}
              value={eventDate}
              onChange={(event) => {
                touched("eventDate");
                setEventDate(event.target.value);
              }}
              required
              {...fieldA11y("eventDate")}
            />
            {fieldError("eventDate")}
          </div>

          <div className="bf-field">
            <div className="a11y-label-row">
              <label htmlFor="bf-ready-time">
                Preciso estar pronta às <span className="bf-required" aria-hidden="true">*</span>
              </label>
              <HelpTip id="bf-help-ready-time" topic="horário em que precisa estar pronta">
                {HELP_TEXTS.readyTime}
              </HelpTip>
            </div>
            <input
              id="bf-ready-time"
              type="time"
              value={readyTime}
              onChange={(event) => {
                touched("readyTime");
                setReadyTime(event.target.value);
              }}
              required
              {...fieldA11y("readyTime", "bf-help-ready-time")}
            />
            {fieldError("readyTime")}
          </div>
        </div>

        <div className="bf-field">
          <label htmlFor="bf-notes">
            Observações <span className="bf-optional">(opcional)</span>
          </label>
          <textarea
            id="bf-notes"
            rows={3}
            placeholder="Alguma informação importante?"
            value={notes}
            onChange={(event) => {
              touched();
              setNotes(event.target.value);
            }}
          />
        </div>

        <div className="bf-actions">
          <button type="submit" className="bf-button bf-button-primary">
            Enviar pelo WhatsApp
          </button>
        </div>

        <p className="bf-hint bf-send-note">
          O envio só acontece quando você confirmar no seu WhatsApp, e o horário
          depende da confirmação da Tereza.
        </p>

        <div className="bf-send-status" role="status" aria-live="polite">
          {sendResult?.status === "opened" && (
            <p className="bf-send-ok">
              WhatsApp aberto com a sua mensagem. Confirme o envio por lá.
            </p>
          )}
        </div>

        {sendResult?.status === "unconfirmed" && (
          <div className="bf-fallback" role="alert">
            <p>
              O WhatsApp não abriu? Copie a mensagem e envie para {STUDIO_WHATSAPP_LABEL}.
            </p>

            <button type="button" className="bf-button bf-button-outline" onClick={handleCopy}>
              Copiar mensagem
            </button>

            {copyFeedback && <p className="bf-hint">{copyFeedback.text}</p>}

            {copyFeedback && !copyFeedback.copied && (
              <textarea
                className="bf-fallback-text"
                aria-label="Mensagem para copiar"
                value={sendResult.message}
                readOnly
                rows={6}
              />
            )}
          </div>
        )}

        <p className="bf-footnote">
          <span aria-hidden="true">*</span> Campos obrigatórios. Seus dados não ficam salvos no site.
          {/* Nova aba: abrir o aviso não apaga o que já foi preenchido. */}{" "}
          Saiba como seus dados são usados no{" "}
          <a href="/privacidade" className="privacy-link" target="_blank" rel="noopener">
            Aviso de privacidade<span className="a11y-sr-only"> (abre em nova aba)</span>
          </a>.
        </p>
      </form>

      {/* Confirmação curta antes de abrir o WhatsApp. Esc ou "Corrigir
          dados" fecham e devolvem ao formulário, com tudo preenchido. */}
      <dialog className="bf-dialog" ref={dialogRef} aria-labelledby="bf-dialog-title">
        <h3 id="bf-dialog-title">Confirme seus dados</h3>

        <dl className="bf-dialog-list">
          {confirmRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <p className="bf-hint">
          O WhatsApp abrirá com a mensagem pronta. Para enviar, confirme por lá.
        </p>

        <div className="bf-actions">
          <button type="button" className="bf-button bf-button-outline" onClick={handleCorrect}>
            Corrigir dados
          </button>

          <button type="button" className="bf-button bf-button-primary" onClick={handleConfirm}>
            Confirmar e abrir WhatsApp
          </button>
        </div>
      </dialog>
    </div>
  );
}

export default BookingForm;
