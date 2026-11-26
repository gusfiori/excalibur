/** Marca do Excalibur (mesmo desenho do ícone da aba: src/app/icon.svg). */
export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="7" fill="#18181b" />
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
        <path d="M24.5 7.5 L13.5 18.5" />
        <path d="M24.5 7.5 L21 8.2 M24.5 7.5 L23.8 11" />
        <path d="M10 15 L17 22" />
        <path d="M13.5 18.5 L9 23" />
      </g>
      <circle cx="8.2" cy="23.8" r="1.6" fill="#fff" />
    </svg>
  );
}
