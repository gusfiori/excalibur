"use client";

import { useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import Editor, { type Scene } from "@/components/Editor";
import { useLandingTheme } from "@/components/landing/LandingShell";
import { readDraft, saveDraft } from "@/lib/draft";
import { buildWelcome } from "@/lib/templates";
import { THEMES } from "@/lib/themes";

const EMPTY: Scene = { elements: [], appState: {}, files: {} };

/**
 * O editor de verdade, na página inicial. O que o visitante desenha fica
 * guardado no navegador (rascunho) e vira o primeiro quadro dele ao entrar.
 */
export default function Playground() {
  const { theme } = useLandingTheme();
  const [initial, setInitial] = useState<Scene | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Sem rascunho: o desenho de boas-vindas entra depois que o editor carrega a fonte. */
  const needsWelcome = useRef(false);
  /** O desenho de boas-vindas não conta como rascunho (só o que o visitante fizer). */
  const skipNextSave = useRef(false);

  // Volta o rascunho de uma visita anterior, se houver
  useEffect(() => {
    const draft = readDraft();
    needsWelcome.current = !draft;
    Promise.resolve(draft ?? EMPTY).then(setInitial);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  /**
   * Monta o desenho de boas-vindas só depois que a fonte do editor está
   * carregada; antes disso os textos seriam medidos com a fonte errada.
   */
  const placeWelcome = async (api: ExcalidrawImperativeAPI) => {
    if (!needsWelcome.current) return;
    needsWelcome.current = false;
    const font = THEMES[theme].drawing.fontFamily === 5 ? "Excalifont" : "Nunito";
    await new Promise((r) => setTimeout(r, 0));
    await document.fonts.load(`20px ${font}`).catch(() => {});
    const [{ CaptureUpdateAction }, elements] = await Promise.all([import("@excalidraw/excalidraw"), buildWelcome(theme)]);
    skipNextSave.current = true;
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
    setTimeout(() => api.scrollToContent(undefined, { fitToContent: true, viewportZoomFactor: 0.85 }), 60);
  };

  if (!initial) {
    return <div className="flex h-full items-center justify-center text-sm text-ink-faint">Preparando o quadro…</div>;
  }

  return (
    <div className="relative h-full">
      <Editor
        initialScene={initial}
        theme={theme}
        fitOnLoad
        onApi={(api) => void placeWelcome(api)}
        onChange={(scene) => {
          if (skipNextSave.current) {
            skipNextSave.current = false;
            return;
          }
          clearTimeout(timer.current);
          timer.current = setTimeout(() => saveDraft(scene), 500);
        }}
      />
    </div>
  );
}
