// Dados do aviso de privacidade (/privacidade). A página é genérica; para
// outra profissional, troque os valores abaixo e os de contact.ts.
import { WHATSAPP_NUMBER } from "./contact";

export const PRIVACY = {
  // Responsável pelos dados (controladora, na LGPD).
  controllerName: "Tereza Figueiredo — Beauty Artist",
  city: "Rio de Janeiro (RJ)",
  // "5521998730052" → "(21) 99873-0052"
  whatsappLabel: WHATSAPP_NUMBER.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3"),
  lastUpdated: "novembro de 2026",
  // Conservação e exclusão dos dados, um parágrafo por item — texto
  // definido pela profissional (nov/2026). Vale para as conversas no
  // WhatsApp (o site não guarda nada). Não prometer exclusão automática.
  // Para outra profissional, usar o texto dela; com null, a página mostra
  // um aviso de pendência no lugar.
  retention: [
    "As informações compartilhadas nas conversas comerciais pelo WhatsApp são conservadas, como regra, por até 12 meses após o último contato comercial relevante ou a realização do atendimento, o que ocorrer por último.",
    "Após esse prazo, as informações que não forem mais necessárias serão excluídas ou anonimizadas, conforme os recursos disponíveis e as obrigações aplicáveis.",
    "Alguns registros poderão ser conservados por períodos diferentes quando necessários ao cumprimento de obrigações legais ou regulatórias, ao exercício regular de direitos ou em outras hipóteses de conservação previstas na LGPD.",
  ] as string[] | null,
};
