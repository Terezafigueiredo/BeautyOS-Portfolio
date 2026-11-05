// Funções puras compartilhadas pelos formulários de agendamento (modal das
// páginas de serviço e formulário da Home). Nada aqui grava dados.

// Formata a data local (YYYY-MM-DD) sem passar por toISOString(),
// que converte para UTC e pode "voltar" um dia perto da meia-noite.
export function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Telefone brasileiro plausível: 10 ou 11 dígitos (com DDD), aceitando
// também o código do país (55) na frente. Só checagem de formato — o
// número não é armazenado em lugar nenhum.
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return national.length === 10 || national.length === 11;
}

// "HH:MM" → minutos desde 00:00.
export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Horário de início estimado (pronta às − duração). Vazio se cairia no
// dia anterior — a duração não cabe antes do horário informado.
export function estimateStartTime(readyTime: string, durationMinutes: number) {
  if (!readyTime) return "";

  const startInMinutes = timeToMinutes(readyTime) - durationMinutes;

  if (startInMinutes < 0) {
    return "";
  }

  const startHour = Math.floor(startInMinutes / 60);
  const startMinute = startInMinutes % 60;

  return `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${remainingMinutes}`;
}

// "AAAA-MM-DD" → "DD/MM/AAAA".
export function formatDateBR(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

// Fallback de cópia para navegadores sem Clipboard API (ou contexto não
// seguro): cria um textarea temporário, seleciona e usa execCommand.
export function copyTextFallback(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;

  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);

  return succeeded;
}

// Copia o texto (Clipboard API quando disponível, senão o fallback).
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // segue para o fallback
  }

  return copyTextFallback(text);
}
