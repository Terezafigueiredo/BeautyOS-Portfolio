// Regras de preço — fonte única. Valores SEMPRE em centavos inteiros
// (nada de float para dinheiro); a conversão para texto só acontece na
// exibição, via formatBRL().

export type ServiceLocation = "studio" | "home";

// Produção Social: atendimento a domicílio = valor do ateliê + R$ 150,00.
export const SOCIAL_HOME_SURCHARGE_CENTS = 150_00;

// Valor final da Produção Social para o local escolhido. O adicional de
// domicílio é aplicado exatamente uma vez, aqui e em nenhum outro lugar.
export function socialPriceCents(studioPriceCents: number, location: ServiceLocation): number {
  if (!Number.isInteger(studioPriceCents) || studioPriceCents <= 0) {
    throw new Error("Preço do ateliê inválido");
  }
  return location === "home"
    ? studioPriceCents + SOCIAL_HOME_SURCHARGE_CENTS
    : studioPriceCents;
}

// Pacotes Noiva e Debutante: MESMA tabela para as duas páginas.
// Valores de domicílio são preços FINAIS (não há adicional aqui — a regra
// de +R$ 150,00 vale só para a Produção Social).
export type BridalDebutanteTier = "bronze" | "prata" | "ouro";

const BRIDAL_DEBUTANTE_PRICES_CENTS = {
  bronze: { studio: 400_00, home: 700_00 },
  prata: { studio: 650_00, home: 900_00 },
  ouro: { fixed: 1_800_00 },
} as const;

// Textos de preço no formato usado pelos cards das páginas Noiva e
// Debutante (studioPrice/homePrice ou fixedPrice).
export function bridalDebutantePriceLabels(tier: BridalDebutanteTier): {
  studioPrice?: string;
  homePrice?: string;
  fixedPrice?: string;
} {
  const prices = BRIDAL_DEBUTANTE_PRICES_CENTS[tier];
  if ("fixed" in prices) {
    return { fixedPrice: formatBRL(prices.fixed) };
  }
  return { studioPrice: formatBRL(prices.studio), homePrice: formatBRL(prices.home) };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// "R$ 1.800,00". O Intl separa "R$" do número com espaço não separável;
// trocamos por espaço comum para ficar idêntico aos demais preços do site
// (o resumo do formulário já impede a quebra de linha do valor).
export function formatBRL(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error("Valor em centavos deve ser inteiro");
  }
  return brl.format(cents / 100).replace(/ /g, " ");
}
