"use client";

import { useEffect, useRef, useState } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { THEMES, type ThemeId } from "@/lib/themes";

type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;

/** O que salvamos de cada quadro. */
export type Scene = {
  elements: OnChangeArgs[0];
  appState: { viewBackgroundColor?: string };
  files: OnChangeArgs[2];
};

type EditorProps = {
  initialScene?: Scene;
  theme: ThemeId;
  /** Chamado só quando o desenho realmente muda (não a cada movimento do mouse). */
  onChange: (scene: Scene) => void;
};

/** Estilo padrão dos próximos elementos, conforme o tema. */
function drawingDefaults(theme: ThemeId) {
  const { roughness, fontFamily, roundness } = THEMES[theme].drawing;
  return {
    // O fundo é do tema (pontos/grade desenhados por trás do canvas)
    viewBackgroundColor: "transparent",
    currentItemRoughness: roughness,
    currentItemFontFamily: fontFamily,
    currentItemRoundness: roundness,
  } as const;
}

const GRID = 20; // distância base entre os pontos/linhas do fundo, em pixels

export default function Editor({ initialScene, theme, onChange }: EditorProps) {
  // "Assinatura" do último estado visto, para ignorar eventos que não mudam nada
  // (seleção, rolagem, zoom...).
  const lastKey = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);

  /** Faz o fundo pontilhado/quadriculado acompanhar a rolagem e o zoom. */
  const syncBackground = (scrollX: number, scrollY: number, zoom: number) => {
    const el = canvasRef.current;
    if (!el) return;
    let size = GRID * zoom;
    while (size < 10) size *= 5; // muito afastado: espaça o padrão para não virar borrão
    el.style.setProperty("--grid-size", `${size}px`);
    el.style.setProperty("--grid-x", `${scrollX * zoom}px`);
    el.style.setProperty("--grid-y", `${scrollY * zoom}px`);
    el.style.setProperty("--grid-zoom", `${Math.min(Math.max(zoom, 0.6), 2)}`);
  };

  // Posição inicial do fundo, assim que o editor fica pronto
  useEffect(() => {
    if (!api) return;
    const s = api.getAppState();
    syncBackground(s.scrollX, s.scrollY, s.zoom.value);
  }, [api]);

  // Trocou de tema com o quadro aberto: aplica o novo estilo padrão na hora
  useEffect(() => {
    api?.updateScene({ appState: drawingDefaults(theme) });
  }, [api, theme]);

  return (
    <div ref={canvasRef} className="board-canvas absolute inset-0">
      <Excalidraw
        excalidrawAPI={setApi}
        langCode="pt-BR"
        theme={THEMES[theme].editorMode}
        UIOptions={{ canvasActions: { changeViewBackgroundColor: false, toggleTheme: false } }}
        initialData={{
          elements: initialScene?.elements ?? [],
          files: initialScene?.files,
          appState: drawingDefaults(theme),
          scrollToContent: Boolean(initialScene?.elements.length),
        }}
        onScrollChange={(scrollX, scrollY, zoom) => syncBackground(scrollX, scrollY, zoom.value)}
        onChange={(elements, appState, files) => {
          const key = `${getSceneVersion(elements)}|${Object.keys(files).length}`;
          const first = lastKey.current === null;
          if (key === lastKey.current) return;
          lastKey.current = key;
          if (first) return; // primeiro evento = carregamento inicial, nada a salvar

          // Guarda só as imagens que ainda estão em uso em algum elemento.
          const usedFileIds = new Set<string>(
            elements.flatMap((el) => (!el.isDeleted && "fileId" in el && el.fileId ? [el.fileId] : [])),
          );
          onChange({
            elements: elements.filter((el) => !el.isDeleted),
            appState: { viewBackgroundColor: appState.viewBackgroundColor },
            files: Object.fromEntries(Object.entries(files).filter(([id]) => usedFileIds.has(id))),
          });
        }}
      />
    </div>
  );
}
