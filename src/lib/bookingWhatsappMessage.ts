// Monta a mensagem de solicitação de agendamento enviada pelo WhatsApp.
// Função pura (sem React, sem rede, sem banco): o site público não grava
// nenhum dado — a cliente revisa e envia a mensagem pelo próprio WhatsApp.
//
// Campos opcionais só entram na mensagem quando informados: o formulário
// da Home não mostra valor quando não há preço inequívoco ("outro
// serviço"), e o WhatsApp da cliente é opcional ali.
export type BookingWhatsappMessageInput = {
  category: string;
  service: string;
  locationLabel: string;
  price?: string | null;
  formattedDate: string;
  eventTime?: string | null;
  readyTime: string;
  estimatedStartTime?: string | null;
  durationLabel?: string | null;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function buildBookingWhatsappMessage(input: BookingWhatsappMessageInput): string {
  const address = input.address?.trim();
  const notes = input.notes?.trim();
  const phone = input.phone?.trim();

  const lines = [
    "Olá, Tereza! Gostaria de solicitar um agendamento.",
    "",
    `*Produção:* ${input.category}`,
    `*Serviço:* ${input.service}`,
    `*Atendimento:* ${input.locationLabel}`,
  ];

  if (input.price) lines.push(`*Valor:* ${input.price}`);

  lines.push("", `*Data do evento:* ${input.formattedDate}`);
  if (input.eventTime) lines.push(`*Horário do evento:* ${input.eventTime}`);
  lines.push(`*Preciso estar pronta às:* ${input.readyTime}`);
  if (input.estimatedStartTime) lines.push(`*Horário estimado de início:* ${input.estimatedStartTime}`);
  if (input.durationLabel) lines.push(`*Duração aproximada:* ${input.durationLabel}`);

  lines.push("", `*Nome:* ${input.name.trim()}`);
  if (phone) lines.push(`*WhatsApp:* ${phone}`);

  if (address) lines.push(`*Local do atendimento:* ${address}`);
  if (notes) lines.push("", `*Observações:* ${notes}`);

  lines.push("", "Gostaria de confirmar a disponibilidade desta data e horário.");

  return lines.join("\n");
}
