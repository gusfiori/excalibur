"use client";

import { useCallback, useEffect, useState } from "react";
import ContextMenu, { type MenuItem } from "@/components/ContextMenu";
import RenameInput from "@/components/RenameInput";
import { ancestorFolderIds, byName, descendantFolderIds } from "@/lib/tree";
import type { Board, Folder, UserInfo } from "@/lib/types";

export type SidebarActions = {
  selectBoard: (id: string) => void;
  /** Cria e devolve o id da nova pasta. */
  createFolder: (parentId: string | null) => string;
  /** Cria, abre e devolve o id do novo quadro. */
  createBoard: (folderId: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  renameBoard: (id: string, name: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  moveBoard: (id: string, folderId: string | null) => void;
  deleteFolder: (id: string) => void;
  deleteBoard: (id: string) => void;
};

type SidebarProps = {
  folders: Folder[];
  boards: Board[];
  activeBoardId: string | null;
  user: UserInfo;
  actions: SidebarActions;
};

type ItemRef = { kind: "folder" | "board"; id: string };
type MenuState = { x: number; y: number; target: ItemRef | null }; // target null = área vazia
type DragState = ItemRef & { forbidden: Set<string> }; // pastas onde não pode soltar
const ROOT = "__root__";

const expandedKey = (userId: string) => `myexcalidraw:expanded:${userId}`;

function readExpanded(userId: string): string[] {
  try {
    const raw = localStorage.getItem(expandedKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function RowButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 opacity-0 hover:bg-zinc-300 hover:text-zinc-900 focus:opacity-100 group-hover:opacity-100"
    >
      {children}
    </button>
  );
}

export default function Sidebar({ folders, boards, activeBoardId, user, actions }: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const active = boards.find((b) => b.id === activeBoardId);
    return new Set([...readExpanded(user.id), ...ancestorFolderIds(folders, active?.folderId ?? null)]);
  });
  const [editing, setEditing] = useState<ItemRef | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(expandedKey(user.id), JSON.stringify([...expanded]));
    } catch {
      // sem localStorage: só não lembra quais pastas estavam abertas
    }
  }, [expanded, user.id]);

  const setOpen = (id: string, open: boolean) =>
    setExpanded((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const closeMenu = useCallback(() => setMenu(null), []);

  // ---------- Ações ----------

  const newFolder = (parentId: string | null) => {
    const id = actions.createFolder(parentId);
    if (parentId) setOpen(parentId, true);
    setEditing({ kind: "folder", id });
  };

  const newBoard = (folderId: string | null) => {
    const id = actions.createBoard(folderId);
    if (folderId) setOpen(folderId, true);
    setEditing({ kind: "board", id });
  };

  const confirmDeleteFolder = (folder: Folder) => {
    const inside = descendantFolderIds(folders, folder.id);
    const subfolders = inside.size - 1;
    const boardCount = boards.filter((b) => b.folderId && inside.has(b.folderId)).length;
    const parts = [
      boardCount > 0 && `${boardCount} ${boardCount === 1 ? "quadro" : "quadros"}`,
      subfolders > 0 && `${subfolders} ${subfolders === 1 ? "subpasta" : "subpastas"}`,
    ].filter(Boolean);
    const detail = parts.length ? ` e tudo o que tem dentro (${parts.join(" e ")})` : "";
    if (window.confirm(`Excluir a pasta "${folder.name}"${detail}?\n\nIsso não pode ser desfeito.`)) {
      actions.deleteFolder(folder.id);
    }
  };

  const confirmDeleteBoard = (board: Board) => {
    if (window.confirm(`Excluir o quadro "${board.name}"?\n\nIsso não pode ser desfeito.`)) {
      actions.deleteBoard(board.id);
    }
  };

  const menuItems = (target: ItemRef | null): MenuItem[] => {
    if (!target) {
      return [
        { label: "Nova pasta", onSelect: () => newFolder(null) },
        { label: "Novo quadro", onSelect: () => newBoard(null) },
      ];
    }
    if (target.kind === "folder") {
      const folder = folders.find((f) => f.id === target.id);
      if (!folder) return [];
      return [
        { label: "Novo quadro aqui", onSelect: () => newBoard(folder.id) },
        { label: "Nova subpasta", onSelect: () => newFolder(folder.id) },
        { label: "Renomear", onSelect: () => setEditing(target) },
        ...(folder.parentId ? [{ label: "Mover para a raiz", onSelect: () => actions.moveFolder(folder.id, null) }] : []),
        { label: "Excluir pasta", danger: true, onSelect: () => confirmDeleteFolder(folder) },
      ];
    }
    const board = boards.find((b) => b.id === target.id);
    if (!board) return [];
    return [
      { label: "Renomear", onSelect: () => setEditing(target) },
      ...(board.folderId ? [{ label: "Mover para a raiz", onSelect: () => actions.moveBoard(board.id, null) }] : []),
      { label: "Excluir quadro", danger: true, onSelect: () => confirmDeleteBoard(board) },
    ];
  };

  const openMenuAt = (e: React.MouseEvent, target: ItemRef | null) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, target });
  };

  const openMenuFromButton = (e: React.MouseEvent, target: ItemRef) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ x: rect.left, y: rect.bottom + 4, target });
  };

  // ---------- Arrastar e soltar ----------

  const startDrag = (e: React.DragEvent, item: ItemRef) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setDragging({
      ...item,
      forbidden: item.kind === "folder" ? descendantFolderIds(folders, item.id) : new Set(),
    });
  };

  const endDrag = () => {
    setDragging(null);
    setDropTarget(null);
  };

  /** target = id da pasta de destino, ou null para a raiz. */
  const canDropInto = (target: string | null) => !!dragging && !(target && dragging.forbidden.has(target));

  const dragOver = (e: React.DragEvent, target: string | null) => {
    e.stopPropagation();
    if (!canDropInto(target)) {
      if (dropTarget !== null) setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const key = target ?? ROOT;
    if (dropTarget !== key) setDropTarget(key);
  };

  const drop = (e: React.DragEvent, target: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragging && canDropInto(target)) {
      if (dragging.kind === "folder") {
        const folder = folders.find((f) => f.id === dragging.id);
        if (folder && folder.parentId !== target) actions.moveFolder(dragging.id, target);
      } else {
        const board = boards.find((b) => b.id === dragging.id);
        if (board && board.folderId !== target) actions.moveBoard(dragging.id, target);
      }
      if (target) setOpen(target, true);
    }
    endDrag();
  };

  // ---------- Renderização ----------

  const rowBase = "group flex w-full cursor-pointer select-none items-center gap-1.5 rounded-md py-1 pr-1 text-left text-sm";

  const renderLevel = (parentId: string | null, depth: number): React.ReactNode => {
    const childFolders = folders.filter((f) => f.parentId === parentId).sort(byName);
    const childBoards = boards.filter((b) => b.folderId === parentId).sort(byName);
    const indent = { paddingLeft: 6 + depth * 14 };

    return (
      <>
        {childFolders.map((folder) => {
          const open = expanded.has(folder.id);
          const isEditing = editing?.kind === "folder" && editing.id === folder.id;
          const isDropTarget = dropTarget === folder.id;
          const ref: ItemRef = { kind: "folder", id: folder.id };
          return (
            <div key={folder.id} role="group">
              <div
                role="treeitem"
                aria-expanded={open}
                aria-selected={false}
                tabIndex={0}
                draggable={!isEditing}
                onDragStart={(e) => startDrag(e, ref)}
                onDragEnd={endDrag}
                onDragOver={(e) => dragOver(e, folder.id)}
                onDrop={(e) => drop(e, folder.id)}
                onClick={() => setOpen(folder.id, !open)}
                onDoubleClick={() => setEditing(ref)}
                onContextMenu={(e) => openMenuAt(e, ref)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setOpen(folder.id, !open);
                  if (e.key === "F2") setEditing(ref);
                }}
                className={`${rowBase} text-zinc-700 ${
                  isDropTarget ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-zinc-200/70"
                } ${dragging?.id === folder.id ? "opacity-50" : ""}`}
                style={indent}
              >
                <span className="w-3 shrink-0 text-[10px] text-zinc-400">{open ? "▼" : "▶"}</span>
                <span className="shrink-0">{open ? "📂" : "📁"}</span>
                {isEditing ? (
                  <RenameInput
                    initial={folder.name}
                    onCommit={(name) => {
                      actions.renameFolder(folder.id, name);
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                )}
                {!isEditing && (
                  <>
                    <RowButton
                      title="Novo quadro nesta pasta"
                      onClick={(e) => {
                        e.stopPropagation();
                        newBoard(folder.id);
                      }}
                    >
                      +
                    </RowButton>
                    <RowButton title="Mais opções" onClick={(e) => openMenuFromButton(e, ref)}>
                      ⋯
                    </RowButton>
                  </>
                )}
              </div>
              {open && renderLevel(folder.id, depth + 1)}
            </div>
          );
        })}
        {childBoards.map((board) => {
          const isEditing = editing?.kind === "board" && editing.id === board.id;
          const isActive = board.id === activeBoardId;
          const ref: ItemRef = { kind: "board", id: board.id };
          return (
            <div
              key={board.id}
              role="treeitem"
              aria-selected={isActive}
              tabIndex={0}
              draggable={!isEditing}
              onDragStart={(e) => startDrag(e, ref)}
              onDragEnd={endDrag}
              // Soltar em cima de um quadro = soltar na pasta dele
              onDragOver={(e) => dragOver(e, board.folderId)}
              onDrop={(e) => drop(e, board.folderId)}
              onClick={() => actions.selectBoard(board.id)}
              onDoubleClick={() => setEditing(ref)}
              onContextMenu={(e) => openMenuAt(e, ref)}
              onKeyDown={(e) => {
                if (e.key === "Enter") actions.selectBoard(board.id);
                if (e.key === "F2") setEditing(ref);
              }}
              className={`${rowBase} ${
                isActive ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-700 hover:bg-zinc-200/70"
              } ${dragging?.id === board.id ? "opacity-50" : ""}`}
              style={indent}
            >
              <span className="w-3 shrink-0" />
              <span className="shrink-0">✏️</span>
              {isEditing ? (
                <RenameInput
                  initial={board.name}
                  onCommit={(name) => {
                    actions.renameBoard(board.id, name);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate">{board.name}</span>
              )}
              {!isEditing && (
                <RowButton title="Mais opções" onClick={(e) => openMenuFromButton(e, ref)}>
                  ⋯
                </RowButton>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const isEmpty = folders.length === 0 && boards.length === 0;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="pl-1 text-sm font-semibold text-zinc-900">My Excalidraw</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => newFolder(null)}
            title="Nova pasta"
            className="rounded-md px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
          >
            + Pasta
          </button>
          <button
            type="button"
            onClick={() => newBoard(null)}
            title="Novo quadro"
            className="rounded-md px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
          >
            + Quadro
          </button>
        </div>
      </div>

      <nav
        role="tree"
        aria-label="Pastas e quadros"
        // A área vazia da lista é a "raiz": soltar aqui tira o item de dentro das pastas
        onDragOver={(e) => dragOver(e, null)}
        onDrop={(e) => drop(e, null)}
        onContextMenu={(e) => openMenuAt(e, null)}
        className={`flex-1 overflow-y-auto px-2 pb-4 transition-colors ${
          dropTarget === ROOT ? "bg-blue-50 outline-2 -outline-offset-4 outline-dashed outline-blue-300" : ""
        }`}
      >
        {isEmpty ? (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-zinc-400">
            Nada por aqui ainda.
            <br />
            Crie uma pasta ou um quadro acima.
          </p>
        ) : (
          renderLevel(null, 0)
        )}
      </nav>

      <div className="flex items-center gap-2 border-t border-zinc-200 px-3 py-2.5">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-xs font-semibold text-zinc-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-800">{user.name}</div>
          <div className="truncate text-xs text-zinc-500">{user.email}</div>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800">
            Sair
          </button>
        </form>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.target)} onClose={closeMenu} />}
    </aside>
  );
}
