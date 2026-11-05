import type { AmbientLight, AmbientParticle } from "../home/AmbientBackground";

// Composições do fundo animado da página Produção Social. Mesma linguagem
// da Home (src/components/home/sectionAmbience.ts), mais rosada.
// Posições: [x, y] desktop / [xm, ym] coluna única, em % da seção — nas
// faixas superior/inferior, nas margens laterais ou no vão entre o texto e
// a foto de destaque. Nunca sobre o rosto da foto, os textos ou os botões.

// prettier-ignore
export const SOCIAL_HERO_PARTICLES: AmbientParticle[] = [
  [3, 10, 2, 2, 5, "gold", 2, 19],
  [12, 4, 30, 1, 3, "rose", 1, 24],
  [28, 6, 97, 4, 6, "rose", 2, 18],
  [44, 3, 98, 14, 4, "gold", 1, 26],
  [52, 18, 2, 22, 7, "gold", 3, 16],
  [54, 40, 98, 30, 4, "rose", 2, 21],
  [51, 62, 2, 42, 5, "gold", 2, 20],
  [55, 84, 98, 48, 3, "rose", 1, 25],
  [97, 14, 2, 60, 6, "rose", 2, 17],
  [95, 34, 98, 66, 8, "gold", 3, 15],
  [98, 56, 3, 76, 4, "gold", 1, 27],
  [96, 78, 97, 82, 6, "rose", 2, 19],
  [2, 40, 2, 90, 4, "rose", 1, 23],
  [4, 66, 98, 94, 7, "gold", 3, 16],
  [3, 90, 20, 99, 5, "gold", 2, 22],
  [22, 96, 80, 99, 4, "rose", 2, 20],
  [40, 97, 50, 99, 3, "gold", 1, 26],
  [70, 98, 4, 52, 5, "rose", 2, 18],
  [88, 96, 96, 38, 6, "gold", 2, 21],
  [80, 4, 70, 1, 4, "gold", 2, 24],
  [8, 22, 6, 6, 24, "rose", 4, 26],
  [94, 8, 94, 26, 22, "champagne", 4, 24],
  [50, 92, 6, 70, 26, "gold", 4, 28],
  [97, 92, 94, 96, 20, "rose", 4, 23],
];

// prettier-ignore
export const SOCIAL_HERO_LIGHTS: AmbientLight[] = [
  [8, 30, 0, 10, 380, "rose", 24],
  [78, 46, 70, 70, 520, "champagne", 28],
  [96, 12, 100, 50, 300, "rose", 22],
  [30, 92, 10, 92, 320, "champagne", 26],
];

// prettier-ignore
export const SOCIAL_GALLERY_PARTICLES: AmbientParticle[] = [
  [4, 8, 2, 3, 6, "gold", 2, 18],
  [12, 18, 98, 6, 4, "rose", 1, 25],
  [20, 6, 10, 1, 7, "rose", 3, 16],
  [8, 26, 2, 14, 3, "gold", 1, 27],
  [80, 6, 90, 1, 5, "gold", 2, 20],
  [88, 16, 98, 18, 8, "rose", 3, 17],
  [95, 4, 60, 1, 4, "rose", 2, 22],
  [92, 24, 2, 22, 3, "gold", 1, 24],
  [10, 95, 20, 98, 6, "gold", 2, 19],
  [30, 98, 40, 99, 4, "rose", 1, 26],
  [50, 96, 60, 98, 7, "gold", 3, 15],
  [70, 98, 80, 99, 5, "rose", 2, 21],
  [90, 95, 96, 97, 4, "gold", 2, 23],
  [16, 12, 8, 4, 26, "rose", 4, 27],
  [86, 10, 94, 8, 22, "champagne", 4, 24],
  [40, 97, 30, 98, 24, "champagne", 4, 26],
];

// prettier-ignore
export const SOCIAL_GALLERY_LIGHTS: AmbientLight[] = [
  [0, 25, 0, 10, 360, "champagne", 25],
  [100, 20, 100, 15, 340, "rose", 22],
  [50, 60, 50, 60, 620, "rose", 30],
  [100, 90, 100, 92, 300, "champagne", 23],
];

// prettier-ignore
export const SOCIAL_PACKAGES_PARTICLES: AmbientParticle[] = [
  [4, 6, 2, 2, 5, "gold", 2, 19],
  [10, 18, 98, 8, 7, "rose", 3, 16],
  [3, 32, 2, 18, 4, "rose", 1, 24],
  [8, 48, 98, 28, 6, "gold", 2, 21],
  [4, 64, 2, 38, 3, "gold", 1, 26],
  [10, 80, 98, 50, 8, "rose", 3, 15],
  [5, 94, 2, 62, 5, "gold", 2, 20],
  [96, 8, 98, 72, 6, "rose", 2, 18],
  [90, 22, 2, 82, 4, "gold", 1, 25],
  [97, 38, 98, 92, 7, "gold", 3, 17],
  [92, 54, 2, 97, 5, "rose", 2, 22],
  [96, 70, 50, 99, 3, "gold", 1, 27],
  [90, 86, 98, 99, 6, "rose", 2, 19],
  [30, 4, 20, 1, 4, "gold", 2, 23],
  [70, 3, 80, 1, 5, "rose", 2, 21],
  [8, 12, 6, 6, 24, "champagne", 4, 26],
  [94, 46, 94, 44, 22, "rose", 4, 24],
  [6, 72, 6, 86, 26, "gold", 4, 28],
  [92, 94, 94, 98, 20, "champagne", 4, 23],
];

// prettier-ignore
export const SOCIAL_PACKAGES_LIGHTS: AmbientLight[] = [
  [0, 15, 0, 5, 400, "rose", 24],
  [100, 40, 100, 35, 360, "champagne", 27],
  [0, 80, 0, 75, 340, "champagne", 22],
  [100, 95, 100, 95, 380, "rose", 26],
];
