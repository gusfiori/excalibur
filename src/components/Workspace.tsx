"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BoardView from "@/components/BoardView";
import Sidebar, { type SidebarActions } from "@/components/Sidebar";
import * as db from "@/lib/db";
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

  if (loadError) {
    return <div className="flex h-screen items-center justify-center px-6 text-center text-sm text-red-600">{loadError}</div>;
  }
  if (!tree) {
    return <div className="flex h-screen items-center justify-center text-sm text-zinc-400">Carregando seus quadros…</div>;
  }

  const actions: SidebarActions = {
    selectBoard,

    createFolder(parentId) {
      const folder: Folder = {
        id: crypto.randomUUID(),
        name: uniqueName("Nova pasta", tree.folders.filter((f) => f.parentId === parentId)),
        parentId,
        position: nextPosition(tree.folders.filter((f) => f.parentId === parentId)),
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
      };
      setTree((t) => t && { ...t, boards: [...t.boards, copy] });
      const saved = persist(() => db.duplicateBoard(id, copy));
      creating.set(copy.id, saved);
      saved.finally(() => creating.delete(copy.id)).catch(() => {});
      selectBoard(copy.id);
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
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar folders={tree.folders} boards={tree.boards} activeBoardId={activeBoardId} user={user} actions={actions} />
      <main className="flex min-w-0 flex-1 flex-col">
        {activeBoard ? (
          // key: cada quadro tem seu próprio editor e sua própria fila de salvamento
          <BoardView
            key={activeBoard.id}
            boardId={activeBoard.id}
            boardName={activeBoard.name}
            whenReady={creating.get(activeBoard.id)}
            onRename={(name) => actions.renameBoard(activeBoard.id, name)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-zinc-500">Nenhum quadro aberto.</p>
            <button
              type="button"
              onClick={() => actions.createBoard(null)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Criar quadro
            </button>
          </div>
        )}
      </main>

      {notice && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
