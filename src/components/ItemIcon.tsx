import { COLORS, softColor } from "@/lib/appearance";
import type { ItemAppearance } from "@/lib/types";

type ItemIconProps = ItemAppearance & {
  kind: "folder" | "board";
  open?: boolean;
  size?: number;
};

/**
 * Ícone de uma pasta ou quadro: o emoji escolhido (com fundo suave na cor),
 * ou o ícone padrão desenhado na cor escolhida.
 */
export default function ItemIcon({ kind, icon, color, open, size = 16 }: ItemIconProps) {
  const box = size + 4;

  if (icon) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-[5px] leading-none"
        style={{ width: box, height: box, fontSize: size - 2, background: color ? softColor(color, 26) : undefined }}
      >
        {icon}
      </span>
    );
  }

  const stroke = color ? COLORS[color].hex : "currentColor";
  const fill = color ? softColor(color, 30) : "none";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${color ? "" : "text-ink-muted"}`}
      style={{ width: box, height: box }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === "folder" ? (
          open ? (
            <>
              <path d="M4 19V6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v1" />
              <path d="M4 19l2.6-7.2A2 2 0 0 1 8.5 10.5H21l-2.8 7.4a2 2 0 0 1-1.9 1.1H4z" fill={fill} />
            </>
          ) : (
            <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill={fill} />
          )
        ) : (
          <>
            <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill={fill} />
            <path d="M7.5 15c1.5-3 3-4.5 4.5-1.5s3 1.5 4.5-2" />
          </>
        )}
      </svg>
    </span>
  );
}
