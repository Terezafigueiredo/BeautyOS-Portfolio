"""Gera versões WebP otimizadas das imagens usadas pelo site.

- Lê os originais em src/assets/ (NUNCA os altera nem apaga).
- Escreve em src/assets/optimized/<nome original completo>.webp
  (ex.: "noiva (1).jpg" -> "noiva (1).jpg.webp"), o que evita colisão
  entre arquivos de mesmo nome e extensões diferentes.
- Aplica a orientação EXIF (fotos de celular) antes de redimensionar.
- Remove todos os metadados (EXIF, inclusive localização GPS) da saída.
- Limita o lado maior a MAX_SIDE px, sem nunca ampliar.

Uso (na raiz do projeto):  python scripts/optimize-images.py <arquivo> [<arquivo> ...]
Os nomes são relativos a src/assets/. Requer Python 3 com Pillow (suporte a WebP).
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIDE = 1600
QUALITY = 82

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "assets"
OUT = SRC / "optimized"


def optimize(name: str) -> tuple[int, int, str, bool]:
    source = SRC / name
    target = OUT / (name + ".webp")

    with Image.open(source) as image:
        exif = image.getexif()
        had_gps = 0x8825 in exif  # GPSInfo
        orientation = exif.get(0x0112, 1)

        image = ImageOps.exif_transpose(image)
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)

        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

        image.save(target, "WEBP", quality=QUALITY, method=6)
        info = f"{image.width}x{image.height}, orientação EXIF={orientation}"

    return source.stat().st_size, target.stat().st_size, info, had_gps


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    OUT.mkdir(exist_ok=True)
    total_before = total_after = 0
    for name in sys.argv[1:]:
        before, after, info, had_gps = optimize(name)
        total_before += before
        total_after += after
        gps = " [GPS removido]" if had_gps else ""
        print(f"{before // 1024:>6} KB -> {after // 1024:>5} KB  {name}  ({info}){gps}")
    print(f"TOTAL: {total_before / 1048576:.1f} MB -> {total_after / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
