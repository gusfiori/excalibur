"use client";

import { useEffect, useRef, useState } from "react";
import ItemIcon from "@/components/ItemIcon";
import { COLOR_KEYS, COLORS, EMOJI_GROUPS, firstGrapheme } from "@/lib/appearance";
import type { ItemAppearance } from "@/lib/types";

type AppearancePickerProps = {
  x: number;
  y: number;
  kind: "folder" | "board";
  value: ItemAppearance;
  /** Aplica na hora (a janela continua aberta para ajustar mais). */
  onChange: (patch: Partial<ItemAppearance>) => void;
  onClose: () => void;
};

const WIDTH = 320;
const HEIGHT = 440;

/** Janelinha para escolher a cor e o emoji de uma pasta ou quadro. */
export default function AppearancePicker({ x, y, kind, value, onChange, onClose }: AppearancePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(x, window.innerWidth - WIDTH - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - HEIGHT - 8));

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Ícone e cor"
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-xl"
      style={{ left, top, width: WIDTH, maxHeight: HEIGHT }}
    >
      {/* Prévia + cor */}
      <div className="border-b border-line p-3">
        <div className="mb-2.5 flex items-center gap-2">
          <ItemIcon kind={kind} icon={value.icon} color={value.color} size={22} />
          <span className="text-xs font-medium text-ink-muted">Cor</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor">
          <button
            type="button"
            role="radio"
            aria-checked={value.color === null}
            title="Sem cor"
            onClick={() => onChange({ color: null })}
            className={`relative h-6 w-6 rounded-full border border-line bg-panel ${
              value.color === null ? "ring-2 ring-accent ring-offset-1 ring-offset-panel" : ""
            }`}
          >
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink-faint" />
          </button>
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={value.color === key}
              title={COLORS[key].name}
              onClick={() => onChange({ color: key })}
              className={`h-6 w-6 rounded-full ${
                value.color === key ? "ring-2 ring-accent ring-offset-1 ring-offset-panel" : ""
              }`}
              style={{ background: COLORS[key].hex }}
            />
          ))}
        </div>
      </div>

      {/* Emojis */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <span className="text-xs font-medium text-ink-muted">Ícone</span>
        {value.icon && (
          <button
            type="button"
            onClick={() => onChange({ icon: null })}
            className="rounded px-1.5 py-0.5 text-xs text-ink-muted hover:bg-hover hover:text-ink"
          >
            Remover ícone
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mt-2">
            <div className="mb-1 text-[11px] text-ink-faint">{group.label}</div>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onChange({ icon: emoji })}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-hover ${
                    value.icon === emoji ? "bg-selected" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Qualquer outro emoji */}
      <form
        className="flex gap-1.5 border-t border-line p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          const emoji = firstGrapheme(custom);
          if (emoji) {
            onChange({ icon: emoji });
            setCustom("");
          }
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Cole outro emoji aqui"
          aria-label="Outro emoji"
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <button type="submit" className="rounded-md bg-accent px-2.5 text-xs font-medium text-on-accent hover:opacity-90">
          Usar
        </button>
      </form>
    </div>
  );
}
