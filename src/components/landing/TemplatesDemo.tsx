"use client";

import { useEffect, useRef } from "react";
import { useLandingTheme } from "@/components/landing/LandingShell";
import { buildTemplate, TEMPLATES } from "@/lib/templates";

/**
 * Os modelos prontos se desenhando sozinhos: o traço aparece quando o card
 * entra na tela e de novo ao passar o mouse.
 */
function TemplateCard({ id, name }: { id: (typeof TEMPLATES)[number]["id"]; name: string }) {
  const { theme } = useLandingTheme();
  const cardRef = useRef<HTMLButtonElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  // Gera o SVG do modelo (no estilo do tema) e prepara cada traço para ser "desenhado"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ exportToSvg }, elements] = await Promise.all([import("@excalidraw/excalidraw"), buildTemplate(id, theme)]);
      const svg = await exportToSvg({
        elements,
        appState: { exportBackground: false, viewBackgroundColor: "transparent" },
        files: null,
        exportPadding: 12,
        skipInliningFonts: true,
      });
      if (cancelled || !artRef.current) return;
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("class", "h-full w-full");
      (svg as SVGSVGElement).querySelectorAll("path").forEach((p: SVGPathElement) => p.setAttribute("pathLength", "1"));
      artRef.current.replaceChildren(svg);
    })().catch((e) => console.warn("Não foi possível desenhar o modelo", e));
    return () => {
      cancelled = true;
    };
  }, [id, theme]);

  // Desenha quando aparece na tela
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          card.classList.add("is-drawn");
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  /** Apaga e desenha de novo. */
  const replay = () => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-drawn");
    void card.offsetWidth; // força o navegador a "esquecer" o estado anterior
    card.classList.add("is-drawn");
  };

  return (
    <button
      ref={cardRef}
      type="button"
      onMouseEnter={replay}
      onFocus={replay}
      className="self-draw group overflow-hidden rounded-xl border border-line bg-panel text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-lg"
    >
      <div className="board-canvas aspect-[16/10] border-b border-line" style={{ ["--grid-size" as string]: "12px" }}>
        <div ref={artRef} className="thumb h-full w-full p-3" />
      </div>
      <div className="px-4 py-3 font-medium text-ink group-hover:text-accent">{name}</div>
    </button>
  );
}

export default function TemplatesDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((t) => (
        <TemplateCard key={t.id} id={t.id} name={t.name} />
      ))}
    </div>
  );
}
