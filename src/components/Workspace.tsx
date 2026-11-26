"use client";

import { useEffect, useRef, useState } from "react";
import BoardView from "@/components/BoardView";
import Sidebar from "@/components/Sidebar";
import { createBoard, listTree } from "@/lib/db";
import type { Board, Folder, UserInfo } from "@/lib/types";

type Tree = { folders: Folder[]; boards: Board[] };

const lastBoardKey = (userId: string) => `myexcalidraw:lastBoard:${userId}`;

function readLastBoard(userId: string): string | null {
  try {
    return localStorage.getItem(lastBoardKey(userId));
  } catch {
    return null;
  }
}

function writeLastBoard(userId: string, boardId: string) {
  try {
    localStorage.setItem(lastBoardKey(userId), boardId);
  } catch {
    // sem localStorage (aba anônima etc.): só não lembra o último quadro
  }
}

export default function Workspace({ user }: { user: UserInfo }) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Evita rodar duas vezes em desenvolvimento (React Strict Mode) e criar dois quadros.
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        let data = await listTree();
        // Primeiro acesso: cria um quadro para começar.
        if (data.boards.length === 0) {
          const first = await createBoard("Meu primeiro quadro");
          data = { ...data, boards: [first] };
        }
        const last = readLastBoard(user.id);
        setTree(data);
        setActiveBoardId(data.boards.some((b) => b.id === last) ? last : data.boards[0].id);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        setError(
          code === "42P01" || code === "PGRST205"
            ? "As tabelas ainda não existem no Supabase. Rode o script SQL e recarregue a página."
            : "Não foi possível carregar seus quadros. Recarregue a página.",
        );
      }
    })();
  }, [user.id]);

  const selectBoard = (id: string) => {
    setActiveBoardId(id);
    writeLastBoard(user.id, id);
  };

  if (error) {
    return <div className="flex h-screen items-center justify-center px-6 text-center text-sm text-red-600">{error}</div>;
  }
  if (!tree || !activeBoardId) {
    return <div className="flex h-screen items-center justify-center text-sm text-zinc-400">Carregando seus quadros…</div>;
  }

  const activeBoard = tree.boards.find((b) => b.id === activeBoardId);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        folders={tree.folders}
        boards={tree.boards}
        activeBoardId={activeBoardId}
        onSelectBoard={selectBoard}
        user={user}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {/* key: cada quadro tem seu próprio editor e sua própria fila de salvamento */}
        <BoardView key={activeBoardId} boardId={activeBoardId} boardName={activeBoard?.name ?? ""} />
      </main>
    </div>
  );
}
