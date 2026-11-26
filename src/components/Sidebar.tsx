"use client";

import { useCallback, useEffect, useState } from "react";
import ContextMenu, { type MenuItem } from "@/components/ContextMenu";
import ItemIcon from "@/components/ItemIcon";
import Logo from "@/components/Logo";
import RenameInput from "@/components/RenameInput";
import SidebarSearch from "@/components/SidebarSearch";
import { ancestorFolderIds, byName, descendantFolderIds } from "@/lib/tree";
import type { Board, Folder, ItemAppearance, UserInfo } from "@/lib/types";

export type SidebarActions = {
  selectBoard: (id: string) => void;
  /** Cria e devolve o id da nova pasta. */
  createFolder: (parentId: string | null) => string;
  /** Cria, abre e devolve o id do novo quadro. */
  createBoard: (folderId: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  renameBoard: (id: string, name: string) => void;
  /**
   * Coloca o item na pasta `parentId` (null = raiz) e define a ordem dos itens
   * daquele tipo nessa pasta (`orderedIds`, já incluindo o item).
   */
  place: (kind: "folder" | "board", id: string, parentId: string | null, orderedIds: string[]) => void;
  deleteFolder: (id: string) => void;
  deleteBoard: (id: string) => void;
  duplicateBoard: (id: string) => void;
  /** Muda o ícone e/ou a cor (o que vier em `patch`). */
  setAppearance: (kind: "folder" | "board", id: string, patch: Partial<ItemAppearance>) => void;
};

type SidebarProps = {
  folders: Folder[];
  boards: Board[];
  activeBoardId: string | null;
  user: UserInfo;
  actions: SidebarActions;
  onOpenAppearance: () => void;
  /** Abre o seletor de ícone e cor perto de (x, y). */
  onEditIcon: (kind: "folder" | "board", id: string, x: number, y: number) => void;
};

type ItemRef = { kind: "folder" | "board"; id: string };
type MenuState = { x: number; y: number; target: ItemRef | null | "account" }; // null = área vazia
type DragState = ItemRef & { forbidden: Set<string> }; // pastas onde não pode soltar
/** into = dentro da pasta; before/after = reordenar antes/depois do item. */
type DropTarget = { key: string; mode: "into" | "before" | "after" };
const ROOT = "__root__";

/** Ordem manual (arrastando); itens com a mesma posição ficam em ordem alfabética. */
const byPosition = <T extends { position: number; name: string }>(a: T, b: T) => a.position - b.position || byName(a, b);

const DROP_STYLE: Record<DropTarget["mode"], string> = {
  into: "bg-accent-soft ring-1 ring-accent",
  before: "shadow-[inset_0_2px_0_0_var(--accent)]",
  after: "shadow-[inset_0_-2px_0_0_var(--accent)]",
};

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
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted opacity-0 hover:bg-selected hover:text-ink focus:opacity-100 group-hover:opacity-100"
    >
      {children}
    </button>
  );
}

/** O ícone da linha: clicar abre o seletor de ícone e cor (sem abrir/selecionar a linha). */
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title="Mudar ícone e cor"
      aria-label={label}
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      className="shrink-0 rounded hover:bg-selected"
    >
      {children}
    </button>
  );
}

export default function Sidebar({
  folders,
  boards,
  activeBoardId,
  user,
  actions,
  onOpenAppearance,
  onEditIcon,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const active = boards.find((b) => b.id === activeBoardId);
    return new Set([...readExpanded(user.id), ...ancestorFolderIds(folders, active?.folderId ?? null)]);
  });
  const [editing, setEditing] = useState<ItemRef | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

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
  // Onde o menu está aberto (para o seletor de ícone aparecer no mesmo lugar)
  const menuPos = { x: menu?.x ?? 0, y: menu?.y ?? 0 };

  const openIconPicker = (e: React.MouseEvent, kind: "folder" | "board", id: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onEditIcon(kind, id, rect.left, rect.bottom + 4);
  };

  /** Abre a pasta (e as de cima) e rola até ela. Usado pela busca. */
  const revealFolder = (id: string) => {
    setExpanded((prev) => new Set([...prev, id, ...ancestorFolderIds(folders, id)]));
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-folder-id="${id}"]`);
      el?.scrollIntoView({ block: "nearest" });
      el?.focus();
    });
  };

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

  const menuItems = (target: MenuState["target"]): MenuItem[] => {
    if (target === "account") {
      return [
        { label: "Aparência", onSelect: onOpenAppearance },
        {
          label: "Sair",
          onSelect: () => {
            // Recarrega a página inteira de propósito: limpa da memória tudo da conta que saiu
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            fetch("/auth/signout", { method: "POST" }).finally(() => window.location.assign("/login"));
          },
        },
      ];
    }
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
        { label: "Ícone e cor…", onSelect: () => onEditIcon("folder", folder.id, menuPos.x, menuPos.y) },
        ...(folder.parentId ? [{ label: "Mover para a raiz", onSelect: () => placeAtEnd("folder", folder.id, null) }] : []),
        { label: "Excluir pasta", danger: true, onSelect: () => confirmDeleteFolder(folder) },
      ];
    }
    const board = boards.find((b) => b.id === target.id);
    if (!board) return [];
    return [
      { label: "Renomear", onSelect: () => setEditing(target) },
      { label: "Ícone e cor…", onSelect: () => onEditIcon("board", board.id, menuPos.x, menuPos.y) },
      { label: "Duplicar", onSelect: () => actions.duplicateBoard(board.id) },
      ...(board.folderId ? [{ label: "Mover para a raiz", onSelect: () => placeAtEnd("board", board.id, null) }] : []),
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

  const siblingsOf = (kind: ItemRef["kind"], parentId: string | null): (Folder | Board)[] =>
    kind === "folder"
      ? folders.filter((f) => f.parentId === parentId).sort(byPosition)
      : boards.filter((b) => b.folderId === parentId).sort(byPosition);

  /** Move para o fim da lista de `parentId`. */
  function placeAtEnd(kind: ItemRef["kind"], id: string, parentId: string | null) {
    const ids = siblingsOf(kind, parentId)
      .map((x) => x.id)
      .filter((x) => x !== id);
    actions.place(kind, id, parentId, [...ids, id]);
    if (parentId) setOpen(parentId, true);
  }

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

  /** Pode soltar dentro da pasta `parentId` (null = raiz)? Uma pasta não entra nela mesma. */
  const canPlaceIn = (parentId: string | null) => !!dragging && !(parentId && dragging.forbidden.has(parentId));

  /**
   * Decide o que acontece ao soltar sobre uma linha, pela altura do mouse:
   * - pasta sobre pasta: borda de cima/baixo reordena, meio coloca dentro
   * - quadro sobre quadro: metade de cima/baixo reordena
   * - quadro sobre pasta: coloca dentro; pasta sobre quadro: vai para a pasta do quadro
   */
  const computeDrop = (e: React.DragEvent, row: ItemRef): DropTarget | null => {
    if (!dragging) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;

    if (row.kind === "folder") {
      const folder = folders.find((f) => f.id === row.id);
      if (!folder) return null;
      if (dragging.kind === "folder" && canPlaceIn(folder.parentId)) {
        if (ratio < 0.25) return { key: row.id, mode: "before" };
        if (ratio > 0.75) return { key: row.id, mode: "after" };
      }
      return canPlaceIn(row.id) ? { key: row.id, mode: "into" } : null;
    }

    const board = boards.find((b) => b.id === row.id);
    if (!board) return null;
    if (dragging.kind === "board") return { key: row.id, mode: ratio < 0.5 ? "before" : "after" };
    return canPlaceIn(board.folderId) ? { key: board.folderId ?? ROOT, mode: "into" } : null;
  };

  const updateDropTarget = (e: React.DragEvent, target: DropTarget | null) => {
    e.stopPropagation();
    if (!target) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget?.key !== target.key || dropTarget.mode !== target.mode) setDropTarget(target);
  };

  const dragOverRow = (e: React.DragEvent, row: ItemRef) => updateDropTarget(e, computeDrop(e, row));
  const dragOverRoot = (e: React.DragEvent) =>
    updateDropTarget(e, canPlaceIn(null) ? { key: ROOT, mode: "into" } : null);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = dropTarget;
    const item = dragging;
    endDrag();
    if (!target || !item) return;

    if (target.mode === "into") {
      const parentId = target.key === ROOT ? null : target.key;
      // Já está nessa pasta: não mexe na ordem
      if (siblingsOf(item.kind, parentId).some((x) => x.id === item.id)) return;
      placeAtEnd(item.kind, item.id, parentId);
      return;
    }

    // Reordenar antes/depois de um item do mesmo tipo
    const rowItem: Folder | Board | undefined =
      item.kind === "folder" ? folders.find((f) => f.id === target.key) : boards.find((b) => b.id === target.key);
    if (!rowItem || rowItem.id === item.id) return;
    const parentId = "parentId" in rowItem ? rowItem.parentId : rowItem.folderId;
    const ids = siblingsOf(item.kind, parentId)
      .map((x) => x.id)
      .filter((x) => x !== item.id);
    const index = ids.indexOf(rowItem.id) + (target.mode === "after" ? 1 : 0);
    ids.splice(index, 0, item.id);
    actions.place(item.kind, item.id, parentId, ids);
  };

  // ---------- Renderização ----------

  const rowBase =
    "group flex w-full cursor-pointer select-none items-center gap-1.5 rounded-md py-1 pr-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent";

  const renderLevel = (parentId: string | null, depth: number): React.ReactNode => {
    const childFolders = folders.filter((f) => f.parentId === parentId).sort(byPosition);
    const childBoards = boards.filter((b) => b.folderId === parentId).sort(byPosition);
    const indent = { paddingLeft: 6 + depth * 14 };

    return (
      <>
        {childFolders.map((folder) => {
          const open = expanded.has(folder.id);
          const isEditing = editing?.kind === "folder" && editing.id === folder.id;
          const dropMode = dropTarget?.key === folder.id ? dropTarget.mode : null;
          const ref: ItemRef = { kind: "folder", id: folder.id };
          return (
            <div key={folder.id} role="group">
              <div
                role="treeitem"
                aria-expanded={open}
                aria-selected={false}
                data-folder-id={folder.id}
                tabIndex={0}
                draggable={!isEditing}
                onDragStart={(e) => startDrag(e, ref)}
                onDragEnd={endDrag}
                onDragOver={(e) => dragOverRow(e, ref)}
                onDrop={drop}
                onClick={() => setOpen(folder.id, !open)}
                onDoubleClick={() => setEditing(ref)}
                onContextMenu={(e) => openMenuAt(e, ref)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setOpen(folder.id, !open);
                  if (e.key === "F2") setEditing(ref);
                }}
                className={`${rowBase} text-ink-soft ${
                  dropMode ? DROP_STYLE[dropMode] : "hover:bg-hover"
                } ${dragging?.id === folder.id ? "opacity-50" : ""}`}
                style={indent}
              >
                <span className="w-3 shrink-0 text-[10px] text-ink-faint">{open ? "▼" : "▶"}</span>
                <IconButton
                  label={`Ícone e cor de ${folder.name}`}
                  onClick={(e) => openIconPicker(e, "folder", folder.id)}
                >
                  <ItemIcon kind="folder" open={open} icon={folder.icon} color={folder.color} />
                </IconButton>
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
          const dropMode = dropTarget?.key === board.id ? dropTarget.mode : null;
          return (
            <div
              key={board.id}
              role="treeitem"
              aria-selected={isActive}
              tabIndex={0}
              draggable={!isEditing}
              onDragStart={(e) => startDrag(e, ref)}
              onDragEnd={endDrag}
              onDragOver={(e) => dragOverRow(e, ref)}
              onDrop={drop}
              onClick={() => actions.selectBoard(board.id)}
              onDoubleClick={() => setEditing(ref)}
              onContextMenu={(e) => openMenuAt(e, ref)}
              onKeyDown={(e) => {
                if (e.key === "Enter") actions.selectBoard(board.id);
                if (e.key === "F2") setEditing(ref);
              }}
              className={`${rowBase} ${
                isActive ? "bg-selected font-medium text-ink" : "text-ink-soft hover:bg-hover"
              } ${dropMode ? DROP_STYLE[dropMode] : ""} ${dragging?.id === board.id ? "opacity-50" : ""}`}
              style={indent}
            >
              <span className="w-3 shrink-0" />
              <IconButton label={`Ícone e cor de ${board.name}`} onClick={(e) => openIconPicker(e, "board", board.id)}>
                <ItemIcon kind="board" icon={board.icon} color={board.color} />
              </IconButton>
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
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="flex items-center gap-2 pl-1 font-display text-base font-semibold text-ink">
          <Logo />
          Excalibur
        </span>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => newFolder(null)}
            title="Nova pasta"
            className="whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs text-ink-muted hover:bg-hover hover:text-ink"
          >
            + Pasta
          </button>
          <button
            type="button"
            onClick={() => newBoard(null)}
            title="Novo quadro"
            className="whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs text-ink-muted hover:bg-hover hover:text-ink"
          >
            + Quadro
          </button>
        </div>
      </div>

      <SidebarSearch folders={folders} boards={boards} onOpenBoard={actions.selectBoard} onRevealFolder={revealFolder}>
        <nav
          role="tree"
          aria-label="Pastas e quadros"
          // A área vazia da lista é a "raiz": soltar aqui tira o item de dentro das pastas
          onDragOver={dragOverRoot}
          onDrop={drop}
          onContextMenu={(e) => openMenuAt(e, null)}
          className={`flex-1 overflow-y-auto px-2 pb-4 transition-colors ${
            dropTarget?.key === ROOT ? "bg-accent-soft outline-2 -outline-offset-4 outline-dashed outline-accent" : ""
          }`}
        >
          {isEmpty ? (
            <p className="px-2 py-6 text-center text-xs leading-relaxed text-ink-faint">
              Nada por aqui ainda.
              <br />
              Crie uma pasta ou um quadro acima.
            </p>
          ) : (
            renderLevel(null, 0)
          )}
        </nav>
      </SidebarSearch>

      <div className="border-t border-line p-1.5">
        <button
          type="button"
          title="Conta e aparência"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenu({ x: rect.left + 8, y: rect.top - 8 - 2 * 34, target: "account" });
          }}
          className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-hover"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-semibold text-ink-soft">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-muted">{user.email}</div>
          </div>
          <span className="shrink-0 text-ink-faint" aria-hidden="true">
            ⋯
          </span>
        </button>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.target)} onClose={closeMenu} />}
    </aside>
  );
}
