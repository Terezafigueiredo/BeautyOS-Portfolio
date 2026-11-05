import type { AmbientLight, AmbientParticle, AmbientTone } from "../home/AmbientBackground";
import {
  SOCIAL_GALLERY_LIGHTS,
  SOCIAL_GALLERY_PARTICLES,
  SOCIAL_HERO_LIGHTS,
  SOCIAL_HERO_PARTICLES,
  SOCIAL_PACKAGES_LIGHTS,
  SOCIAL_PACKAGES_PARTICLES,
} from "../social/socialAmbience";

// Fundo animado de Debutante e Noiva: as mesmas posições da Social (o
// layout das três páginas é o mesmo — capa em duas colunas, galeria,
// pacotes), só com outra paleta. Assim nada cobre rostos, textos ou botões.

type Toned = AmbientParticle | AmbientLight;

// Troca o tom `from` por `to` em um a cada `every` elementos desse tom,
// mantendo a mistura de cores.
function retone<T extends Toned>(items: T[], from: AmbientTone, to: AmbientTone, every = 1): T[] {
  let seen = 0;
  return items.map((item) => {
    if (item[5] !== from) return item;
    seen += 1;
    if (seen % every !== 0) return item;
    const copy = [...item] as T;
    copy[5] = to;
    return copy;
  });
}

// Debutante: romântica — mais rosa nas luzes, partículas rosadas e
// douradas na mesma medida, um toque de champanhe.
const debutante = <T extends Toned>(items: T[]) => retone(retone(items, "gold", "rose", 3), "gold", "champagne", 4);

export const DEBUTANTE_HERO_PARTICLES = debutante(SOCIAL_HERO_PARTICLES);
export const DEBUTANTE_HERO_LIGHTS = retone(SOCIAL_HERO_LIGHTS, "champagne", "rose", 2);
export const DEBUTANTE_GALLERY_PARTICLES = debutante(SOCIAL_GALLERY_PARTICLES);
export const DEBUTANTE_GALLERY_LIGHTS = SOCIAL_GALLERY_LIGHTS;
export const DEBUTANTE_PACKAGES_PARTICLES = debutante(SOCIAL_PACKAGES_PARTICLES);
export const DEBUTANTE_PACKAGES_LIGHTS = SOCIAL_PACKAGES_LIGHTS;

// Noiva: champanhe, pérola e dourado, com rosa só como acento.
const noiva = <T extends Toned>(items: T[]) => retone(items, "rose", "champagne", 1);
const noivaLights = (items: AmbientLight[]) => retone(items, "rose", "champagne", 2);

export const NOIVA_HERO_PARTICLES = retone(SOCIAL_HERO_PARTICLES, "rose", "champagne", 2);
export const NOIVA_HERO_LIGHTS = noivaLights(SOCIAL_HERO_LIGHTS);
export const NOIVA_GALLERY_PARTICLES = noiva(SOCIAL_GALLERY_PARTICLES);
export const NOIVA_GALLERY_LIGHTS = noivaLights(SOCIAL_GALLERY_LIGHTS);
export const NOIVA_PACKAGES_PARTICLES = retone(SOCIAL_PACKAGES_PARTICLES, "rose", "champagne", 2);
export const NOIVA_PACKAGES_LIGHTS = noivaLights(SOCIAL_PACKAGES_LIGHTS);
