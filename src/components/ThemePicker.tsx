"use client";

import { useEffect } from "react";
import { THEME_IDS, THEMES, type ThemeId } from "@/lib/themes";

/** Miniatura do app desenhada com as cores do próprio tema. */
function ThemePreview({ theme }: { theme: ThemeId }) {
  return (
    <div data-theme={theme} className="flex h-28 overflow-hidden rounded-lg border border-line" aria-hidden="true">
      <div className="flex w-[36%] flex-col gap-1.5 bg-sidebar p-2">
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" />
          <span className="font-display text-[10px] font-semibold text-ink">Excalibur</span>
        </div>
        <span className="h-1.5 rounded bg-hover" />
        <span className="h-1.5 w-4/5 rounded bg-selected" />
        <span className="h-1.5 w-3/5 rounded bg-hover" />
        <span className="h-1.5 w-2/3 rounded bg-hover" />
      </div>
      <div className="board-canvas relative flex-1" style={{ ["--grid-size" as string]: "9px" }}>
        <span className="absolute left-[14%] top-[22%] h-8 w-12 rounded-md border-[1.5px] border-accent" />
        <span className="absolute left-[56%] top-[30%] h-8 w-8 rounded-full border-[1.5px] border-ink-muted" />
        <span className="absolute left-[20%] top-[70%] h-[1.5px] w-[55%] bg-ink-soft" />
      </div>
    </div>
  );
}

type ThemePickerProps = {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
};

/** Os três temas lado a lado; o selecionado ganha borda na cor de destaque. */
export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div role="radiogroup" aria-label="Estilo" className="grid gap-3 sm:grid-cols-3">
      {THEME_IDS.map((id) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={`flex flex-col gap-2.5 rounded-xl border-2 bg-panel p-2.5 text-left transition ${
              selected ? "border-accent" : "border-line hover:border-ink-faint"
            }`}
          >
            <ThemePreview theme={id} />
            <div className="px-1 pb-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{THEMES[id].name}</span>
                {id === "caderno" && <span className="text-[11px] text-ink-faint">padrão</span>}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{THEMES[id].description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

type ThemeDialogProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  onDone: () => void;
  /** Esc fecha (no primeiro acesso não fecha: precisa escolher). */
  dismissible?: boolean;
};

/** Janela com o seletor de tema (primeiro acesso e menu "Aparência"). */
export function ThemeDialog({ title, subtitle, actionLabel, value, onChange, onDone, dismissible }: ThemeDialogProps) {
  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissible, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onPointerDown={(e) => dismissible && e.target === e.currentTarget && onDone()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-dialog-title"
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-panel p-6 shadow-xl sm:p-8"
      >
        <h2 id="theme-dialog-title" className="font-display text-2xl font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 mb-6 text-sm text-ink-muted">{subtitle}</p>
        <ThemePicker value={value} onChange={onChange} />
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onDone}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-on-accent hover:opacity-90"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
