import { useState } from "react";
import type { CSSProperties } from "react";

import MotionToggle from "../a11y/MotionToggle";

// Galeria em faixa automática das páginas de serviço.
//
// Para leitores de tela é uma lista: cada foto é um item com a própria
// descrição (alt), e a lista informa a quantidade. A segunda volta da faixa
// (cópia que fecha o laço visual) fica oculta, para nada ser lido duas vezes.
// O botão de pausa para o movimento; com "menos movimento" no sistema a
// faixa já fica parada (CSS).

export type GalleryPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  objectPosition?: string;
};

type EditorialGalleryProps = {
  photos: GalleryPhoto[];
  // Nome da galeria para leitores de tela (ex.: "Fotos de produções sociais").
  label: string;
  // Classes próprias de cada página (faixa, trilho e cartão).
  marqueeClassName: string;
  trackClassName: string;
  cardClassName: string;
  // Quantidade de fotos para a qual a duração do CSS foi calibrada.
  timingBase: number;
};

function EditorialGallery({
  photos,
  label,
  marqueeClassName,
  trackClassName,
  cardClassName,
  timingBase,
}: EditorialGalleryProps) {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div
        className={`${marqueeClassName} ed-marquee reveal${paused ? " is-paused" : ""}`}
        style={{ "--rd": "0.15s" } as CSSProperties}
        role="group"
        aria-label={`${label} (${photos.length} fotos)`}
      >
        <div
          className={trackClassName}
          role="list"
          style={{ "--gallery-scale": photos.length / timingBase } as CSSProperties}
        >
          {[...photos, ...photos].map((photo, index) => {
            const copy = index >= photos.length;

            return (
              <div
                className={`${cardClassName} ed-gallery-card`}
                key={`${photo.src}-${index}`}
                role={copy ? undefined : "listitem"}
                aria-hidden={copy ? true : undefined}
              >
                <img
                  src={photo.src}
                  alt={copy ? "" : photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="ed-gallery-controls reveal" style={{ "--rd": "0.2s" } as CSSProperties}>
        <MotionToggle paused={paused} onToggle={() => setPaused(!paused)} subject="galeria" />
      </div>
    </>
  );
}

export default EditorialGallery;
