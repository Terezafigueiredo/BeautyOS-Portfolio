import { formatBRL, socialPriceCents } from "../../lib/pricing";
import type { ServiceLocation } from "../../lib/pricing";
import { packages as debutantePackages } from "../../pages/Debutante";
import { packages as bridalPackages } from "../../pages/Noiva";
import { services as socialServices } from "../../pages/Social";

// Opções do formulário de agendamento da Home, montadas a partir dos MESMOS
// dados das páginas Social, Debutante e Noiva (nomes, durações, preços e
// regras de local). Nenhum preço é definido aqui.

export type ProductionGroup = "social" | "debutante" | "noiva" | "outro";

export type BookingOption = {
  id: string;
  group: ProductionGroup;
  category: string;
  service: string;
  durationMinutes: number | null;
  // Locais permitidos (os pacotes Ouro são realizados no local do evento).
  locations: ServiceLocation[];
  // Preço só quando há correspondência exata com a tabela; null = a combinar.
  priceFor: (location: ServiceLocation) => string | null;
};

export const PRODUCTION_GROUPS: { id: ProductionGroup; label: string }[] = [
  { id: "social", label: "Produção Social" },
  { id: "debutante", label: "Produção Debutante" },
  { id: "noiva", label: "Produção Noiva" },
  { id: "outro", label: "Outra produção" },
];

export const LOCATION_LABELS: Record<ServiceLocation, string> = {
  studio: "Ateliê",
  home: "Domicílio",
};

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function packageOption(
  group: "debutante" | "noiva",
  category: string,
  item: (typeof debutantePackages)[number],
): BookingOption {
  if (item.fixedPrice) {
    return {
      id: slug(item.title),
      group,
      category,
      service: item.title,
      durationMinutes: item.durationMinutes,
      locations: ["home"],
      priceFor: (location) => (location === "home" ? item.fixedPrice ?? null : null),
    };
  }

  return {
    id: slug(item.title),
    group,
    category,
    service: item.title,
    durationMinutes: item.durationMinutes,
    locations: ["studio", "home"],
    priceFor: (location) => (location === "studio" ? item.studioPrice : item.homePrice) ?? null,
  };
}

export const BOOKING_OPTIONS: BookingOption[] = [
  ...socialServices.map(
    (item): BookingOption => ({
      id: `social-${slug(item.title)}`,
      group: "social",
      category: "Produção Social",
      service: item.title,
      durationMinutes: item.durationMinutes,
      locations: ["studio", "home"],
      priceFor: (location) => formatBRL(socialPriceCents(item.studioPriceCents, location)),
    }),
  ),
  ...debutantePackages.map((item) => packageOption("debutante", "Produção Debutante", item)),
  ...bridalPackages.map((item) => packageOption("noiva", "Produção Noiva", item)),
  {
    id: "outro",
    group: "outro",
    category: "Outra produção",
    service: "Outro serviço (a combinar)",
    durationMinutes: null,
    locations: ["studio", "home"],
    priceFor: () => null,
  },
];

export function isProductionGroup(value: string | null): value is ProductionGroup {
  return PRODUCTION_GROUPS.some((group) => group.id === value);
}
