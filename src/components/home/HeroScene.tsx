import type { CSSProperties, ComponentType } from "react";
import { Link } from "react-router-dom";

import perfilBeauty from "../../assets/optimized/perfil.png.webp";
import { IconArrow, IconCrown, IconLotus, IconMirror, IconRing } from "./heroIcons";

// Composição da foto. Todas as posições são em % do palco.
//
// Regra da foto: o arquivo original é exibido sem nenhuma alteração. Os
// efeitos da FRENTE (pó, pétalas, brilho do halo, etiquetas) ficam apenas
// nos cantos superiores livres do arco ou na faixa do vestido (abaixo de
// ~78% da altura do arco) — nunca sobre o rosto ou o cabelo. O restante
// fica ATRÁS da foto.

type CssVars = Record<`--${string}`, string | number>;
const cssVars = (vars: CssVars) => vars as CSSProperties;

type Tone = "rose" | "bronze" | "champagne";

type Cloud = { x: number; y: number; width: number; tone: Tone; delay: number };

const CLOUDS_BACK: Cloud[] = [
  { x: -8, y: 50, width: 54, tone: "rose", delay: 1300 },
  { x: 60, y: 28, width: 48, tone: "bronze", delay: 1420 },
  { x: 58, y: -6, width: 34, tone: "champagne", delay: 1540 },
  { x: -6, y: 6, width: 32, tone: "rose", delay: 1640 },
  { x: 66, y: 58, width: 42, tone: "rose", delay: 1500 },
  { x: 0, y: 30, width: 30, tone: "bronze", delay: 1720 },
];

const CLOUDS_FRONT: Cloud[] = [
  { x: -10, y: 80, width: 44, tone: "rose", delay: 1480 },
  { x: 64, y: 76, width: 42, tone: "bronze", delay: 1600 },
];

// Grãos de pó que se soltam das nuvens e se dispersam para fora da foto.
const DUST = Array.from({ length: 26 }, (_, i) => {
  const fromLeft = i % 2 === 0;
  const angle = (((fromLeft ? 200 : -20) + ((i * 47) % 70) - 35) * Math.PI) / 180;
  const distance = 70 + ((i * 29) % 90);
  return {
    x: fromLeft ? 14 : 82,
    y: fromLeft ? 68 : 44,
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance),
    size: 2.5 + (i % 4) * 1.2,
    tone: (i % 3 === 0 ? "bronze" : "rose") as Tone,
    delay: 1500 + i * 180,
    duration: 5200 + (i % 5) * 700,
  };
});

// Partículas douradas distribuídas em espiral (ângulo de ouro) ao redor do
// arco: posições fixas, iguais em toda renderização.
const SPARKS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * 137.508 * Math.PI) / 180;
  const radius = 33 + (i % 6) * 2.4;
  return {
    x: Math.round((50 + Math.cos(angle) * radius) * 10) / 10,
    y: Math.round((47 + Math.sin(angle) * radius * 1.1) * 10) / 10,
    size: 4 + (i % 4) * 2,
    delay: 1500 + (i % 12) * 70,
    duration: 3600 + (i % 7) * 520,
  };
});

const PETALS_BACK = [
  { x: 80, y: 2, size: 20, blur: 4, rotate: 10 },
  { x: 2, y: 62, size: 16, blur: 5, rotate: -40 },
];

const PETALS_FRONT = [
  { x: 2, y: 30, size: 30, blur: 3, rotate: -20 },
  { x: 92, y: 58, size: 24, blur: 2, rotate: 40 },
  { x: 14, y: 94, size: 22, blur: 4, rotate: 70 },
];

// Anéis do halo: círculos achatados e inclinados; girar o círculo faz os
// traços de luz percorrerem a órbita.
const RINGS = [
  { cy: 390, r: 290, squash: 0.4, tilt: -16, width: 2, delay: 900, duration: 26 },
  { cy: 360, r: 305, squash: 0.5, tilt: 14, width: 1.2, delay: 1050, duration: 34 },
  { cy: 420, r: 270, squash: 0.32, tilt: -4, width: 2.8, delay: 1200, duration: 22 },
];

type LabelItem = {
  text: string;
  Icon: ComponentType<{ className?: string }>;
  delay: number;
} & ({ to: string } | { href: string });

const LABELS: LabelItem[] = [
  { text: "Maquiagem Social", Icon: IconLotus, to: "/social", delay: 1700 },
  { text: "Noivas", Icon: IconRing, to: "/noiva", delay: 1850 },
  { text: "Debutantes", Icon: IconCrown, to: "/debutante", delay: 2000 },
  { text: "Atendimento Personalizado", Icon: IconMirror, href: "#agendamento", delay: 2150 },
];

// Pincéis fotográficos (PNG/WebP transparentes) fornecidos pela Tereza.
// Enquanto a lista estiver vazia, nenhum pincel é exibido — sem desenhos
// provisórios.
const BRUSHES: { src: string; className: string }[] = [];

function Clouds({ clouds }: { clouds: Cloud[] }) {
  return clouds.map((cloud) => (
    <div
      key={`${cloud.x}-${cloud.y}`}
      className={`th-cloud th-tone-${cloud.tone}`}
      style={cssVars({
        "--x": `${cloud.x}%`,
        "--y": `${cloud.y}%`,
        "--w": `${cloud.width}%`,
        "--d": `${cloud.delay}ms`,
      })}
    >
      <span className="th-cloud-haze" />
      <span className="th-cloud-grain" />
    </div>
  ));
}

function Petals({ petals }: { petals: typeof PETALS_FRONT }) {
  return petals.map((petal) => (
    <span
      key={`${petal.x}-${petal.y}`}
      className="th-petal"
      style={cssVars({
        "--x": `${petal.x}%`,
        "--y": `${petal.y}%`,
        "--s": `${petal.size}px`,
        "--b": `${petal.blur}px`,
        "--r": `${petal.rotate}deg`,
      })}
    />
  ));
}

function HaloRings({ gradientId }: { gradientId: string }) {
  return (
    <svg className="th-halo-svg" viewBox="0 0 600 700" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.4" stopColor="#e9c27c" />
          <stop offset="0.75" stopColor="#c8924a" />
          <stop offset="1" stopColor="#fff1cc" />
        </linearGradient>
      </defs>
      {RINGS.map((ring) => (
        <g key={ring.r} transform={`translate(300 ${ring.cy}) rotate(${ring.tilt}) scale(1 ${ring.squash})`}>
          <circle
            className="th-ring"
            r={ring.r}
            pathLength={1}
            stroke={`url(#${gradientId})`}
            strokeWidth={ring.width}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={cssVars({ "--d": `${ring.delay}ms`, "--t": `${ring.duration}s` })}
          />
        </g>
      ))}
    </svg>
  );
}

function HeroScene() {
  return (
    <div className="th-stage">
      <div className="th-scene">
        {/* Atrás da foto */}
        <div className="th-layer th-layer-glow" aria-hidden="true">
          <span className="th-halo-glow" />
          <HaloRings gradientId="th-gold-back" />
        </div>

        <div className="th-layer th-layer-back" aria-hidden="true">
          <Petals petals={PETALS_BACK} />
          <Clouds clouds={CLOUDS_BACK} />
          {DUST.map((grain, i) => (
            <span
              key={i}
              className={`th-dust th-tone-${grain.tone}${i >= 8 ? " th-extra" : ""}`}
              style={cssVars({
                "--x": `${grain.x}%`,
                "--y": `${grain.y}%`,
                "--dx": `${grain.dx}px`,
                "--dy": `${grain.dy}px`,
                "--s": `${grain.size}px`,
                "--d": `${grain.delay}ms`,
                "--t": `${grain.duration}ms`,
              })}
            />
          ))}
          {SPARKS.map((spark, i) => (
            <span
              key={i}
              className={`th-spark${i >= 10 ? " th-extra" : ""}`}
              style={cssVars({
                "--x": `${spark.x}%`,
                "--y": `${spark.y}%`,
                "--s": `${spark.size}px`,
                "--d": `${spark.delay}ms`,
                "--t": `${spark.duration}ms`,
              })}
            />
          ))}
        </div>

        {/* Foto original, em arco */}
        <div className="th-photo-depth">
          <span className="th-photo-ring" aria-hidden="true" />
          <div className="th-photo">
            <img
              src={perfilBeauty}
              alt="Tereza Figueiredo, beauty artist, sorrindo, com cabelos loiros ondulados, maquiagem em tons rosados e vestido rosa metálico"
              width={1023}
              height={1537}
              fetchPriority="high"
              decoding="async"
            />
            <span className="th-photo-veil" aria-hidden="true" />
          </div>
        </div>

        {/* Na frente da foto (somente fora da área do rosto e do cabelo) */}
        <div className="th-layer th-layer-front" aria-hidden="true">
          <div className="th-halo-front">
            <HaloRings gradientId="th-gold-front" />
          </div>
          <Clouds clouds={CLOUDS_FRONT} />
          <Petals petals={PETALS_FRONT} />
        </div>

        {BRUSHES.length > 0 && (
          <div className="th-layer th-layer-brushes" aria-hidden="true">
            {BRUSHES.map((brush) => (
              <img key={brush.src} src={brush.src} alt="" className={`th-brush ${brush.className}`} />
            ))}
          </div>
        )}
      </div>

      <ul className="th-labels" aria-label="Atendimentos">
        {LABELS.map(({ text, Icon, delay, ...target }, i) => {
          const content = (
            <>
              <span className="th-label-icon">
                <Icon />
              </span>
              <span className="th-label-text">{text}</span>
              <span className="th-label-arrow">
                <IconArrow />
              </span>
            </>
          );

          return (
            <li key={text} className={`th-label-slot th-label-slot-${i + 1}`} style={cssVars({ "--d": `${delay}ms` })}>
              <span className="th-label-float">
                {"to" in target ? (
                  <Link to={target.to} className="th-label">
                    {content}
                  </Link>
                ) : (
                  <a href={target.href} className="th-label">
                    {content}
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default HeroScene;
