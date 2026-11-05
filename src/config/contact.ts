// Configuração central de contato do BeautyOS.
// Para trocar o número de WhatsApp do estúdio, altere apenas a linha abaixo.
export const WHATSAPP_NUMBER = "5521998730052";

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

// Perfil profissional no Instagram (marca pública).
export const INSTAGRAM_LINK = "https://www.instagram.com/terezafigueiredobeautyartist";

export function getWhatsAppMessageUrl(message: string) {
  return `${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;
}
