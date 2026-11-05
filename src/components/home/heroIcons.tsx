import type { ReactNode } from "react";

// Ícones de linha da capa. Decorativos: o texto ao lado já diz o que são.
type IconProps = { className?: string };

function LineIcon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </LineIcon>
  );
}

export function IconHeart({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" />
    </LineIcon>
  );
}

export function IconSparkles({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M11 3l1.6 4.4L17 9l-4.4 1.6L11 15l-1.6-4.4L5 9l4.4-1.6z" />
      <path d="M18.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </LineIcon>
  );
}

export function IconDiamond({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M6.5 4h11L21 9l-9 11L3 9z" />
      <path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" />
    </LineIcon>
  );
}

export function IconLotus({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 18.5c-1.9-1.8-2.6-4.9 0-10 2.6 5.1 1.9 8.2 0 10z" />
      <path d="M12 18.5c-3.6.4-6.6-1.4-8.2-4.6 3.3-.6 5.9.6 8.2 4.6zM12 18.5c3.6.4 6.6-1.4 8.2-4.6-3.3-.6-5.9.6-8.2 4.6z" />
    </LineIcon>
  );
}

export function IconRing({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M10 6.5 12 9.5l2-3-1-2h-2z" />
    </LineIcon>
  );
}

export function IconCrown({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M4 17h16l1.5-9-5.5 4-4-6-4 6-5.5-4z" />
      <path d="M5 20h14" />
    </LineIcon>
  );
}

export function IconMirror({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="9.5" r="6" />
      <path d="M12 15.5V21M9.5 21h5M9.5 7.5a3 3 0 0 1 2.5-1.5" />
    </LineIcon>
  );
}

export function IconWhatsApp({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41z" />
    </svg>
  );
}
