"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppearancePicker from "@/components/AppearancePicker";
import BoardView from "@/components/BoardView";
import Sidebar, { type SidebarActions } from "@/components/Sidebar";
import { ThemeDialog } from "@/components/ThemePicker";
import * as db from "@/lib/db";
import { saveTheme } from "@/lib/preferences";
import { DEFAULT_THEME, type ThemeId } from "@/lib/themes";
import { descendantFolderIds, uniqueName } from "@/lib/tree";
import type { Board, Folder, UserInfo } from "@/lib/types";

type Tree = { folders: Folder[]; boards: Board[] };

/** Itens novos vão para o fim da lista. */
const nextPosition = (siblings: { position: number }[]) => Math.floor(Math.max(0, ...siblings.map((s) => s.position))) + 1;

const lastBoardKey = (userId: string) => `myexcalidraw:lastBoard:${userId}`;

function readLastBoard(userId: string): string | null {
  try {
    return localStorage.getItem(lastBoardKey(userId));
  } catch {
    return null;
  }
}

function writeLastBoard(userId: string, boardId: string | null) {
  try {
    if (boardId) localStorage.setItem(lastBoardKey(userId), boardId);
    else localStorage.removeItem(lastBoardKey(userId));
  } catch {
    // sem localStorage (aba anônima etc.): só não lembra o último quadro
  }
}

export default function Workspace({ user }: { user: UserInfo }) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  // Tema: o salvo na conta, ou o padrão (Caderno) enquanto a pessoa escolhe no primeiro acesso
  const [theme, setTheme] = useState<ThemeId>(user.theme ?? DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<ThemeId | null>(user.theme);
  // Seletor de ícone e cor aberto (para qual item e onde)
  const [iconPicker, setIconPicker] = useState<{ kind: "folder" | "board"; id: string; x: number; y: number } | null>(
    null,
  );
  const closeIconPicker = useCallback(() => setIconPicker(null), []);
  const [themeDialog, setThemeDialog] = useState<"first" | "appearance" | null>(user.theme ? null : "first");
  // Quadros recém-criados: o editor espera a gravação no banco terminar antes de carregar/salvar.
  const [creating] = useState(() => new Map<string, Promise<void>>());
  const started = useRef(false);

  const selectBoard = useCallback(
    (id: string | null) => {
      setActiveBoardId(id);
      writeLastBoard(user.id, id);
    },
    [user.id],
  );

  // Carregamento inicial
  useEffect(() => {
    // Evita rodar duas vezes em desenvolvimento (React Strict Mode).
    if (started.current) return;
    started.current = true;

    db.listTree()
      .then((data) => {
        const last = readLastBoard(user.id);
        setTree(data);
        setActiveBoardId(data.boards.some((b) => b.id === last) ? last : (data.boards[0]?.id ?? null));
      })
      .catch((e) => {
        const code = (e as { code?: string })?.code;
        setLoadError(
          code === "42P01" || code === "PGRST205"
            ? "As tabelas ainda não existem no Supabase. Rode o script SQL e recarregue a página."
            : "Não foi possível carregar seus quadros. Recarregue a página.",
        );
      });
  }, [user.id]);

  // Some sozinho depois de alguns segundos
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  /**
   * Atualiza a tela na hora e grava no banco em seguida. Se a gravação falhar,
   * avisa e recarrega tudo do banco para a tela voltar a refletir a verdade.
   */
  const persist = useCallback(
    (write: () => Promise<void>) => {
      const p = write();
      p.catch(async (e) => {
        console.error(e);
        setNotice("Não foi possível salvar a última alteração. Sua lista foi recarregada.");
        try {
          const fresh = await db.listTree();
          setTree(fresh);
          setActiveBoardId((current) => (fresh.boards.some((b) => b.id === current) ? current : (fresh.boards[0]?.id ?? null)));
        } catch {
          // sem conexão: mantém o que está na tela
        }
      });
      return p;
    },
    [],
  );

  /** Fecha o seletor e grava o tema na conta (se mudou ou se é o primeiro acesso). */
  const finishThemeChoice = () => {
    setThemeDialog(null);
    if (theme === savedTheme) return;
    const chosen = theme;
    saveTheme(chosen)
      .then(() => setSavedTheme(chosen))
      .catch((e) => {
        console.error(e);
        setNotice("Não foi possível salvar o tema na sua conta. Tente de novo em Aparência.");
      });
  };

  // Telas de carregamento/erro já com as cores do tema
  const shell = (content: React.ReactNode) => (
    <div data-theme={theme} className="flex h-screen items-center justify-center bg-app px-6 text-center text-sm">
      {content}
    </div>
  );

  if (loadError) {
    return shell(<span className="text-red-600">{loadError}</span>);
  }
  if (!tree) {
    return shell(<span className="text-ink-faint">Carregando seus quadros…</span>);
  }

  const actions: SidebarActions = {
    selectBoard,

    createFolder(parentId) {
      const folder: Folder = {
        id: crypto.randomUUID(),
        name: uniqueName("Nova pasta", tree.folders.filter((f) => f.parentId === parentId)),
        parentId,
        position: nextPosition(tree.folders.filter((f) => f.parentId === parentId)),
        icon: null,
        color: null,
      };
      setTree((t) => t && { ...t, folders: [...t.folders, folder] });
      persist(() => db.createFolder(folder));
      return folder.id;
    },

    createBoard(folderId) {
      const board: Board = {
        id: crypto.randomUUID(),
        name: uniqueName("Sem título", tree.boards.filter((b) => b.folderId === folderId)),
        folderId,
        position: nextPosition(tree.boards.filter((b) => b.folderId === folderId)),
        icon: null,
        color: null,
      };
      setTree((t) => t && { ...t, boards: [...t.boards, board] });
      const saved = persist(() => db.createBoard(board));
      creating.set(board.id, saved);
      saved.finally(() => creating.delete(board.id)).catch(() => {});
      selectBoard(board.id);
      return board.id;
    },

    renameFolder(id, name) {
      setTree((t) => t && { ...t, folders: t.folders.map((f) => (f.id === id ? { ...f, name } : f)) });
      persist(() => db.updateFolder(id, { name }));
    },

    renameBoard(id, name) {
      setTree((t) => t && { ...t, boards: t.boards.map((b) => (b.id === id ? { ...b, name } : b)) });
      persist(() => db.updateBoard(id, { name }));
    },

    place(kind, id, parentId, orderedIds) {
      if (kind === "folder" && parentId && descendantFolderIds(tree.folders, id).has(parentId)) return; // não cabe dentro de si mesma
      // Posições 1, 2, 3... na nova ordem; só grava no banco o que mudou.
      const position = new Map(orderedIds.map((x, i) => [x, i + 1]));
      if (kind === "folder") {
        const changed = tree.folders.filter(
          (f) => position.has(f.id) && (f.position !== position.get(f.id) || (f.id === id && f.parentId !== parentId)),
        );
        setTree(
          (t) =>
            t && {
              ...t,
              folders: t.folders.map((f) =>
                position.has(f.id) ? { ...f, position: position.get(f.id)!, ...(f.id === id ? { parentId } : {}) } : f,
              ),
            },
        );
        persist(async () => {
          await Promise.all(
            changed.map((f) => db.updateFolder(f.id, { position: position.get(f.id)!, ...(f.id === id ? { parentId } : {}) })),
          );
        });
      } else {
        const changed = tree.boards.filter(
          (b) => position.has(b.id) && (b.position !== position.get(b.id) || (b.id === id && b.folderId !== parentId)),
        );
        setTree(
          (t) =>
            t && {
              ...t,
              boards: t.boards.map((b) =>
                position.has(b.id) ? { ...b, position: position.get(b.id)!, ...(b.id === id ? { folderId: parentId } : {}) } : b,
              ),
            },
        );
        persist(async () => {
          await Promise.all(
            changed.map((b) =>
              db.updateBoard(b.id, { position: position.get(b.id)!, ...(b.id === id ? { folderId: parentId } : {}) }),
            ),
          );
        });
      }
    },

    deleteFolder(id) {
      const removed = descendantFolderIds(tree.folders, id);
      const remainingBoards = tree.boards.filter((b) => !(b.folderId && removed.has(b.folderId)));
      setTree((t) => t && { folders: t.folders.filter((f) => !removed.has(f.id)), boards: remainingBoards });
      if (activeBoardId && !remainingBoards.some((b) => b.id === activeBoardId)) {
        selectBoard(remainingBoards[0]?.id ?? null);
      }
      persist(() => db.deleteFolder(id));
    },

    duplicateBoard(id) {
      const source = tree.boards.find((b) => b.id === id);
      if (!source) return;
      const copy: Board = {
        id: crypto.randomUUID(),
        name: uniqueName(`${source.name} (cópia)`, tree.boards.filter((b) => b.folderId === source.folderId)),
        folderId: source.folderId,
        position: source.position + 0.5, // logo abaixo do original
        icon: source.icon,
        color: source.color,
      };
      setTree((t) => t && { ...t, boards: [...t.boards, copy] });
      const saved = persist(() => db.duplicateBoard(id, copy));
      creating.set(copy.id, saved);
      saved.finally(() => creating.delete(copy.id)).catch(() => {});
      selectBoard(copy.id);
    },

    setAppearance(kind, id, patch) {
      if (kind === "folder") {
        setTree((t) => t && { ...t, folders: t.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
        persist(() => db.updateFolder(id, patch));
      } else {
        setTree((t) => t && { ...t, boards: t.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
        persist(() => db.updateBoard(id, patch));
      }
    },

    deleteBoard(id) {
      const deleted = tree.boards.find((b) => b.id === id);
      const remainingBoards = tree.boards.filter((b) => b.id !== id);
      setTree((t) => t && { ...t, boards: t.boards.filter((b) => b.id !== id) });
      if (activeBoardId === id) {
        // Prefere abrir outro quadro da mesma pasta
        const sibling = remainingBoards.find((b) => b.folderId === deleted?.folderId);
        selectBoard((sibling ?? remainingBoards[0])?.id ?? null);
      }
      persist(() => db.deleteBoard(id));
    },
  };

  const activeBoard = tree.boards.find((b) => b.id === activeBoardId);

  return (
    <div data-theme={theme} className="flex h-screen w-screen overflow-hidden bg-app text-ink">
      <Sidebar
        folders={tree.folders}
        boards={tree.boards}
        activeBoardId={activeBoardId}
        user={user}
        actions={actions}
        onOpenAppearance={() => setThemeDialog("appearance")}
        onEditIcon={(kind, id, x, y) => setIconPicker({ kind, id, x, y })}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {activeBoard ? (
          // key: cada quadro tem seu próprio editor e sua própria fila de salvamento
          <BoardView
            key={activeBoard.id}
            boardId={activeBoard.id}
            boardName={activeBoard.name}
            boardIcon={activeBoard.icon}
            boardColor={activeBoard.color}
            onEditIcon={(x, y) => setIconPicker({ kind: "board", id: activeBoard.id, x, y })}
            theme={theme}
            whenReady={creating.get(activeBoard.id)}
            onRename={(name) => actions.renameBoard(activeBoard.id, name)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-ink-muted">Nenhum quadro aberto.</p>
            <button
              type="button"
              onClick={() => actions.createBoard(null)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90"
            >
              Criar quadro
            </button>
          </div>
        )}
      </main>

      {iconPicker &&
        (() => {
          const item =
            iconPicker.kind === "folder"
              ? tree.folders.find((f) => f.id === iconPicker.id)
              : tree.boards.find((b) => b.id === iconPicker.id);
          if (!item) return null;
          return (
            <AppearancePicker
              x={iconPicker.x}
              y={iconPicker.y}
              kind={iconPicker.kind}
              value={{ icon: item.icon, color: item.color }}
              onChange={(patch) => actions.setAppearance(iconPicker.kind, iconPicker.id, patch)}
              onClose={closeIconPicker}
            />
          );
        })()}

      {themeDialog && (
        <ThemeDialog
          title={themeDialog === "first" ? "Escolha seu estilo" : "Aparência"}
          subtitle={
            themeDialog === "first"
              ? "Dá para trocar quando quiser, clicando no seu nome no canto da tela."
              : "O estilo vale para todos os seus quadros, em qualquer computador."
          }
          actionLabel={themeDialog === "first" ? "Continuar" : "Pronto"}
          value={theme}
          onChange={setTheme}
          onDone={finishThemeChoice}
          dismissible={themeDialog === "appearance"}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-accent px-4 py-2 text-sm text-on-accent shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
