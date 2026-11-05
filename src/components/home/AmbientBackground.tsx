import type { CSSProperties } from "react";

import { useInView } from "../../hooks/useInView";

// Fundo animado das seções da Home (estilos em src/styles/ambient.css).
// Posições em % da seção: [x, y] no desktop e [xm, ym] em coluna única
// (até 900px) — sempre nos espaços vazios, nunca sobre os textos.

export type AmbientTone = "gold" | "rose" | "champagne";

// depth: 1 = fundo (pequena, desfocada, lenta) … 3 = frente (maior,
// brilhante); 4 = orbes desfocados maiores (bokeh).
export type AmbientParticle = [
  x: number,
  y: number,
  xm: number,
  ym: number,
  size: number,
  tone: AmbientTone,
  depth: 1 | 2 | 3 | 4,
  seconds: number,
];

// Luzes difusas: diâmetro em px.
export type AmbientLight = [
  x: number,
  y: number,
  xm: number,
  ym: number,
  size: number,
  tone: AmbientTone,
  seconds: number,
];

// Cada partícula percorre um trajeto próprio (dois pontos de passagem),
// com velocidade e atraso diferentes — fixos, iguais a cada renderização.
const particleStyle = ([x, y, xm, ym, size, , , seconds]: AmbientParticle, i: number) =>
  ({
    "--x": `${x}%`,
    "--y": `${y}%`,
    "--xm": `${xm}%`,
    "--ym": `${ym}%`,
    "--s": `${size}px`,
    "--t": `${seconds}s`,
    "--d": `${-((i * 7) % seconds)}s`,
    "--fx1": `${(((i * 37) % 50) - 25) * 1.6}px`,
    "--fy1": `${-(18 + ((i * 23) % 30)) * 1.6}px`,
    "--fx2": `${(((i * 53) % 40) - 20) * 1.6}px`,
    "--fy2": `${-(6 + ((i * 17) % 22)) * 1.6}px`,
  }) as CSSProperties;

const lightStyle = ([x, y, xm, ym, size, , seconds]: AmbientLight, i: number) =>
  ({
    "--x": `${x}%`,
    "--y": `${y}%`,
    "--xm": `${xm}%`,
    "--ym": `${ym}%`,
    "--s": `${size}px`,
    "--t": `${seconds}s`,
    "--d": `${-((i * 5) % seconds)}s`,
  }) as CSSProperties;

type AmbientBackgroundProps = {
  particles: AmbientParticle[];
  lights: AmbientLight[];
};

function AmbientBackground({ particles, lights }: AmbientBackgroundProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0);

  return (
    <div ref={ref} className={inView ? "ambient" : "ambient is-offscreen"} aria-hidden="true">
      {lights.map((light, i) => (
        <span
          key={`light-${i}`}
          className={`ambient-light ambient-tone-${light[5]}`}
          style={lightStyle(light, i)}
        />
      ))}
      {particles.map((particle, i) => (
        <span
          key={`particle-${i}`}
          className={`ambient-particle ambient-tone-${particle[5]} ambient-depth-${particle[6]}`}
          style={particleStyle(particle, i)}
        />
      ))}
    </div>
  );
}

export default AmbientBackground;
