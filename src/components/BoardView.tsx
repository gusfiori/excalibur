"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Scene } from "@/components/Editor";
import ItemIcon from "@/components/ItemIcon";
import RenameInput from "@/components/RenameInput";
import { getBoardScene, saveBoardScene, saveThumbnail } from "@/lib/db";
import type { ThemeId } from "@/lib/themes";
import { renderThumbnail } from "@/lib/thumbnail";
import type { Board } from "@/lib/types";

// O Excalidraw usa APIs do navegador (window, canvas), então só carrega no cliente.
const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => <Centered>Carregando editor…</Centered>,
});

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 3000;
const THUMBNAIL_DELAY_MS = 3000; // a miniatura espera mais: não precisa ser a cada traço

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  pending: "Alterações não salvas",
  saving: "Salvando…",
  saved: "Salvo ✓",
  error: "Erro ao salvar — tentando de novo…",
};

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center text-sm text-ink-faint">{children}</div>;
}

/**
 * Fila de salvamento de um quadro: espera o usuário parar de desenhar,
 * grava uma vez por vez e tenta de novo se a gravação falhar.
 */
function createAutosaver(
  boardId: string,
  onStatus: (s: SaveStatus) => void,
  onSaved: (scene: Scene) => void,
  whenReady?: Promise<void>,
) {
  let pending: Scene | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Quadro recém-criado: só grava depois que ele existir no banco.
  let chain: Promise<void> = whenReady ? whenReady.catch(() => {}) : Promise.resolve();

  function flush() {
    clearTimeout(timer);
    const toSave = pending;
    if (!toSave) return;
    pending = null;
    onStatus("saving");
    chain = chain
      .then(() => saveBoardScene(boardId, toSave))
      .then(() => {
        if (!pending) onStatus("saved");
        onSaved(toSave);
      })
      .catch(() => {
        // Não perde a alteração: se nada mais novo chegou, tenta de novo daqui a pouco.
        if (!pending) pending = toSave;
        onStatus("error");
        clearTimeout(timer);
        timer = setTimeout(flush, RETRY_DELAY_MS);
      });
  }

  function schedule(scene: Scene) {
    pending = scene;
    onStatus("pending");
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  }

  return { schedule, flush, hasPending: () => pending !== null };
}

/**
 * Gera e grava a miniatura do quadro para a galeria, sem pressa: espera alguns
 * segundos depois da última alteração salva.
 */
function createThumbnailer(boardId: string, onThumbnail: (thumb: string | null) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let next: Scene | null = null;

  async function run() {
    clearTimeout(timer);
    const scene = next;
    next = null;
    if (!scene) return;
    try {
      const thumb = await renderThumbnail(scene);
      await saveThumbnail(boardId, thumb);
      onThumbnail(thumb);
    } catch (e) {
      console.warn("Não foi possível gerar a miniatura", e);
    }
  }

  function schedule(scene: Scene, delay = THUMBNAIL_DELAY_MS) {
    next = scene;
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  }

  return { schedule, flush: run };
}

/** Um quadro aberto: carrega o desenho do banco e salva sozinho a cada alteração. */
type BoardViewProps = {
  board: Board;
  /** Abre o seletor de ícone e cor perto de (x, y). */
  onEditIcon: (x: number, y: number) => void;
  onToggleFavorite: () => void;
  /** O desenho foi gravado no banco (para "editado agora"). */
  onSaved: () => void;
  /** Miniatura nova para a galeria. */
  onThumbnail: (thumb: string | null) => void;
  theme: ThemeId;
  /** Presente quando o quadro acabou de ser criado e ainda está sendo gravado no banco. */
  whenReady?: Promise<void>;
  onRename: (name: string) => void;
};

export default function BoardView({
  board,
  onEditIcon,
  onToggleFavorite,
  onSaved,
  onThumbnail,
  theme,
  whenReady,
  onRename,
}: BoardViewProps) {
  const { id: boardId, name: boardName, icon: boardIcon, color: boardColor } = board;
  const [scene, setScene] = useState<Scene | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [renaming, setRenaming] = useState(false);

  // BoardView é recriado a cada troca de quadro (key), então o boardId não muda aqui.
  const [thumbnailer] = useState(() => createThumbnailer(boardId, onThumbnail));
  const [saver] = useState(() =>
    createAutosaver(
      boardId,
      setStatus,
      (saved) => {
        onSaved();
        thumbnailer.schedule(saved);
      },
      whenReady,
    ),
  );

  // Título da aba do navegador: "Nome do quadro · Excalibur"
  useEffect(() => {
    document.title = `${boardIcon ? `${boardIcon} ` : ""}${boardName} · Excalibur`;
    return () => {
      document.title = "Excalibur";
    };
  }, [boardName, boardIcon]);

  // Carrega o desenho
  useEffect(() => {
    let cancelled = false;
    (whenReady ?? Promise.resolve())
      .then(() => getBoardScene(boardId))
      .then((s) => {
        if (cancelled) return;
        setScene(s);
        // Atualiza a miniatura ao abrir (quadros antigos ainda não têm)
        thumbnailer.schedule(s, 1500);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [boardId, whenReady, thumbnailer]);

  // Ao trocar de quadro (desmontar), salva o que faltava.
  // Ao fechar/recarregar a aba com algo pendente, salva e pede confirmação.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saver.hasPending()) {
        saver.flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      saver.flush();
      void thumbnailer.flush();
    };
  }, [saver, thumbnailer]);

  return (
    <>
      <header className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            title="Mudar ícone e cor"
            aria-label="Mudar ícone e cor do quadro"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onEditIcon(rect.left, rect.bottom + 4);
            }}
            className="shrink-0 rounded p-0.5 hover:bg-hover"
          >
            <ItemIcon kind="board" icon={boardIcon} color={boardColor} size={18} />
          </button>
          {renaming ? (
            <RenameInput
              initial={boardName}
              onCommit={(name) => {
                onRename(name);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
              className="w-80 max-w-full rounded border border-accent px-1.5 py-0.5 text-sm font-medium text-ink outline-none ring-2 ring-accent-soft"
            />
          ) : (
            <button
              type="button"
              title="Clique para renomear"
              onClick={() => setRenaming(true)}
              className="truncate rounded px-1.5 py-0.5 font-display text-[15px] font-medium text-ink hover:bg-hover"
            >
              {boardName}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-xs ${status === "error" ? "text-red-600" : "text-ink-faint"}`}>{STATUS_LABEL[status]}</span>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={board.favorite}
            title={board.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className={`rounded p-1 text-base leading-none hover:bg-hover ${board.favorite ? "text-amber-500" : "text-ink-faint"}`}
          >
            {board.favorite ? "★" : "☆"}
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        {loadError ? (
          <Centered>Não foi possível abrir este quadro. Recarregue a página.</Centered>
        ) : scene ? (
          <Editor initialScene={scene} theme={theme} onChange={saver.schedule} />
        ) : (
          <Centered>Abrindo quadro…</Centered>
        )}
      </div>
    </>
  );
}
