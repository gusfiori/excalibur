"use client";

import { useRef } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;

/** O que salvamos de cada quadro. */
export type Scene = {
  elements: OnChangeArgs[0];
  appState: { viewBackgroundColor?: string };
  files: OnChangeArgs[2];
};

type EditorProps = {
  initialScene?: Scene;
  /** Chamado só quando o desenho realmente muda (não a cada movimento do mouse). */
  onChange: (scene: Scene) => void;
};

export default function Editor({ initialScene, onChange }: EditorProps) {
  // "Assinatura" do último estado visto, para ignorar eventos que não mudam nada
  // (seleção, rolagem, zoom...).
  const lastKey = useRef<string | null>(null);

  return (
    <Excalidraw
      langCode="pt-BR"
      initialData={
        initialScene
          ? { elements: initialScene.elements, appState: initialScene.appState, files: initialScene.files, scrollToContent: true }
          : null
      }
      onChange={(elements, appState, files) => {
        const key = `${getSceneVersion(elements)}|${appState.viewBackgroundColor}|${Object.keys(files).length}`;
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
  );
}
