"use client";

import { useEffect, useState } from "react";
import { blobToDataURL } from "@/lib/files";
import { buildTemplate, TEMPLATES, type TemplateId } from "@/lib/templates";
import type { ThemeId } from "@/lib/themes";

type TemplateChooserProps = {
  theme: ThemeId;
  onPick: (id: TemplateId) => void;
  onDismiss: () => void;
};

/** Painel que aparece no quadro vazio: começar de um modelo ou em branco. */
export default function TemplateChooser({ theme, onPick, onDismiss }: TemplateChooserProps) {
  const [previews, setPreviews] = useState<Partial<Record<TemplateId, string>>>({});

  // Desenha a prévia de cada modelo com o estilo do tema atual
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      for (const t of TEMPLATES) {
        const elements = await buildTemplate(t.id, theme);
        const blob = await exportToBlob({
          elements,
          files: null,
          appState: { exportBackground: false, viewBackgroundColor: "transparent" },
          mimeType: "image/webp",
          quality: 0.85,
          maxWidthOrHeight: 360,
          exportPadding: 12,
        });
        const url = await blobToDataURL(blob);
        if (cancelled) return;
        setPreviews((prev) => ({ ...prev, [t.id]: url }));
      }
    })().catch((e) => console.warn("Não foi possível gerar as prévias dos modelos", e));
    return () => {
      cancelled = true;
    };
  }, [theme]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Comece com um modelo</h2>
            <p className="text-sm text-ink-muted">Ou feche e desenhe direto no quadro em branco.</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-ink-faint hover:text-ink"
          >
            Em branco
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className="group overflow-hidden rounded-xl border border-line bg-panel text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <div
                className="board-canvas flex aspect-[16/10] items-center justify-center border-b border-line"
                style={{ ["--grid-size" as string]: "10px" }}
              >
                {previews[t.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[t.id]} alt="" className="thumb h-full w-full object-contain p-2" draggable={false} />
                ) : (
                  <span className="text-xs text-ink-faint">…</span>
                )}
              </div>
              <div className="px-3 py-2 text-sm font-medium text-ink group-hover:text-accent">{t.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
