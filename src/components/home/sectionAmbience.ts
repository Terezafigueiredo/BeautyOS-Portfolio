import type { AmbientLight, AmbientParticle } from "./AmbientBackground";

// Composições do fundo animado de cada seção da Home. Mesma linguagem do
// Sobre, com variações: Serviços mais dourado, Pacotes mais rosado,
// Agendamento com orbes maiores, Rodapé mais esparso.
// Posições: [x, y] desktop / [xm, ym] coluna única, em % da seção — nas
// faixas superior/inferior, nas margens laterais ou atrás dos cartões.

// prettier-ignore
export const SERVICES_PARTICLES: AmbientParticle[] = [
  [3, 8, 1, 2, 5, "gold", 2, 19],
  [12, 18, 98, 4, 7, "gold", 3, 16],
  [20, 6, 50, 1, 3, "rose", 1, 24],
  [8, 28, 1, 10, 4, "rose", 2, 21],
  [84, 10, 98, 14, 6, "gold", 2, 18],
  [92, 24, 1, 20, 9, "gold", 3, 15],
  [78, 4, 30, 2, 4, "rose", 1, 25],
  [97, 40, 98, 32, 5, "rose", 2, 20],
  [2, 52, 1, 44, 6, "gold", 2, 22],
  [98, 66, 98, 58, 4, "gold", 1, 26],
  [3, 78, 1, 70, 7, "rose", 3, 17],
  [96, 86, 98, 80, 5, "gold", 2, 19],
  [10, 94, 20, 96, 4, "gold", 2, 23],
  [30, 97, 70, 98, 6, "rose", 2, 18],
  [55, 92, 45, 93, 3, "gold", 1, 27],
  [72, 96, 85, 97, 7, "gold", 3, 16],
  [88, 93, 10, 99, 4, "rose", 2, 21],
  [45, 3, 75, 4, 5, "gold", 2, 20],
  [66, 7, 98, 90, 3, "rose", 1, 24],
  [6, 20, 8, 6, 24, "rose", 4, 26],
  [86, 30, 92, 3, 20, "champagne", 4, 24],
  [40, 95, 50, 97, 26, "gold", 4, 28],
  [94, 96, 4, 94, 22, "champagne", 4, 23],
];

// prettier-ignore
export const SERVICES_LIGHTS: AmbientLight[] = [
  [4, 12, 0, 4, 360, "champagne", 24],
  [96, 20, 100, 10, 320, "rose", 22],
  [50, 100, 50, 100, 420, "champagne", 28],
  [0, 70, 0, 60, 300, "rose", 26],
  [100, 80, 100, 85, 280, "champagne", 21],
];

// prettier-ignore
export const PORTFOLIO_PARTICLES: AmbientParticle[] = [
  [4, 6, 1, 3, 6, "rose", 2, 18],
  [14, 14, 98, 6, 4, "gold", 1, 25],
  [12, 24, 15, 2, 8, "rose", 3, 16],
  [9, 26, 1, 15, 3, "gold", 1, 27],
  [78, 8, 85, 2, 5, "gold", 2, 20],
  [88, 18, 98, 18, 7, "rose", 3, 17],
  [95, 6, 60, 1, 4, "rose", 2, 22],
  [92, 30, 1, 26, 3, "gold", 1, 24],
  [2, 40, 98, 35, 5, "gold", 2, 19],
  [98, 48, 1, 45, 6, "rose", 2, 21],
  [3, 64, 98, 55, 4, "rose", 1, 26],
  [97, 72, 1, 64, 8, "gold", 3, 15],
  [2, 88, 98, 74, 5, "gold", 2, 20],
  [98, 92, 1, 84, 4, "rose", 2, 23],
  [20, 97, 30, 98, 6, "gold", 2, 18],
  [50, 98, 60, 99, 4, "rose", 1, 25],
  [75, 97, 90, 97, 7, "rose", 3, 16],
  [35, 5, 40, 2, 3, "gold", 1, 24],
  [62, 4, 98, 94, 5, "rose", 2, 19],
  [26, 10, 8, 1, 26, "rose", 4, 27],
  [88, 12, 94, 9, 22, "gold", 4, 24],
  [6, 52, 50, 97, 20, "champagne", 4, 26],
  [94, 60, 10, 97, 28, "rose", 4, 28],
];

// prettier-ignore
export const PORTFOLIO_LIGHTS: AmbientLight[] = [
  [0, 20, 0, 5, 380, "rose", 25],
  [100, 10, 100, 30, 320, "champagne", 22],
  [100, 85, 100, 70, 360, "rose", 27],
  [0, 90, 0, 95, 300, "champagne", 23],
  [50, 0, 50, 0, 300, "rose", 20],
];

// prettier-ignore
export const BOOKING_PARTICLES: AmbientParticle[] = [
  [2, 10, 1, 2, 6, "gold", 2, 18],
  [4, 30, 98, 6, 4, "rose", 1, 24],
  [1, 52, 1, 12, 8, "gold", 3, 16],
  [4, 74, 98, 20, 5, "rose", 2, 21],
  [2, 92, 1, 30, 3, "gold", 1, 26],
  [97, 8, 98, 40, 7, "rose", 3, 17],
  [95, 28, 1, 50, 4, "gold", 2, 22],
  [98, 48, 98, 60, 6, "gold", 2, 19],
  [96, 70, 1, 70, 3, "rose", 1, 25],
  [98, 90, 98, 80, 5, "gold", 2, 20],
  [20, 3, 20, 1, 5, "rose", 2, 21],
  [40, 5, 70, 2, 3, "gold", 1, 27],
  [60, 3, 1, 90, 7, "gold", 3, 15],
  [80, 4, 98, 96, 4, "rose", 2, 23],
  [25, 97, 40, 99, 6, "gold", 2, 18],
  [50, 95, 80, 98, 4, "rose", 1, 26],
  [75, 98, 15, 98, 7, "rose", 3, 16],
  [6, 18, 10, 4, 26, "champagne", 4, 26],
  [94, 84, 90, 97, 24, "rose", 4, 24],
  [50, 4, 50, 1, 20, "gold", 4, 22],
];

// prettier-ignore
export const BOOKING_LIGHTS: AmbientLight[] = [
  [0, 0, 0, 0, 400, "rose", 24],
  [100, 100, 100, 100, 420, "champagne", 27],
  [50, 50, 100, 45, 500, "champagne", 30],
  [100, 0, 0, 60, 300, "rose", 21],
];

// prettier-ignore
export const FOOTER_PARTICLES: AmbientParticle[] = [
  [2, 15, 1, 5, 5, "gold", 2, 19],
  [4, 60, 98, 10, 3, "rose", 1, 25],
  [97, 20, 1, 30, 6, "rose", 2, 18],
  [95, 70, 98, 45, 4, "gold", 2, 22],
  [30, 5, 50, 2, 4, "gold", 1, 24],
  [55, 8, 1, 60, 6, "rose", 3, 16],
  [85, 6, 98, 70, 3, "gold", 1, 26],
  [1, 40, 1, 90, 5, "gold", 2, 20],
  [99, 8, 98, 92, 6, "rose", 2, 21],
  [70, 4, 20, 1, 7, "gold", 3, 17],
  [3, 85, 4, 1, 24, "champagne", 4, 26],
  [97, 45, 94, 1, 22, "champagne", 4, 24],
];

// prettier-ignore
export const FOOTER_LIGHTS: AmbientLight[] = [
  [0, 0, 0, 0, 340, "champagne", 24],
  [100, 100, 100, 100, 360, "rose", 26],
  [60, 0, 100, 40, 280, "rose", 22],
];
