"use client";

import { useState } from "react";
import ItemIcon from "@/components/ItemIcon";
import RenameInput from "@/components/RenameInput";
import { ancestorFolderIds, byName, descendantFolderIds } from "@/lib/tree";
import { greeting, timeAgo } from "@/lib/time";
import type { Board, Folder } from "@/lib/types";

export type GalleryActions = {
  selectBoard: (id: string) => void;
  openHome: () => void;
  openFolder: (id: string) => void;
  createBoard: (folderId: string | null) => string;
  createFolder: (parentId: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  toggleFavorite: (id: string) => void;
};

const RECENT_COUNT = 8;

/** Mesma ordem da sidebar: posição manual, depois nome. */
const byPosition = <T extends { position: number; name: string }>(a: T, b: T) => a.position - b.position || byName(a, b);

/** Últimos quadros abertos (ou editados, se nunca foram abertos). */
export function recentBoards(boards: Board[], count = RECENT_COUNT): Board[] {
  const when = (b: Board) => new Date(b.openedAt ?? b.updatedAt).getTime();
  return [...boards].sort((a, b) => when(b) - when(a)).slice(0, count);
}

export const favoriteBoards = (boards: Board[]) => boards.filter((b) => b.favorite).sort(byName);

// ---------- Cards ----------

function Star({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={on}
      title={on ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-panel/90 text-base leading-none shadow-sm transition hover:scale-110 ${
        on ? "text-amber-500" : "text-ink-faint opacity-0 group-hover:opacity-100 focus:opacity-100"
      }`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}

function BoardCard({
  board,
  thumbnail,
  path,
  actions,
}: {
  board: Board;
  thumbnail: string | null | undefined;
  path?: string;
  actions: GalleryActions;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => actions.selectBoard(board.id)}
      onKeyDown={(e) => e.key === "Enter" && actions.selectBoard(board.id)}
      className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-panel text-left transition hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="board-canvas relative flex aspect-[16/10] items-center justify-center border-b border-line" style={{ ["--grid-size" as string]: "12px" }}>
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="thumb h-full w-full object-contain p-3" draggable={false} />
        ) : (
          <span className="opacity-40">
            <ItemIcon kind="board" icon={board.icon} color={board.color} size={36} />
          </span>
        )}
        <Star on={board.favorite} onClick={() => actions.toggleFavorite(board.id)} />
      </div>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <ItemIcon kind="board" icon={board.icon} color={board.color} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{board.name}</div>
          <div className="truncate text-xs text-ink-faint">
            {path ? `${path} · ` : ""}editado {timeAgo(board.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderCard({
  folder,
  folders,
  boards,
  actions,
}: {
  folder: Folder;
  folders: Folder[];
  boards: Board[];
  actions: GalleryActions;
}) {
  const inside = descendantFolderIds(folders, folder.id);
  const boardCount = boards.filter((b) => b.folderId && inside.has(b.folderId)).length;
  const subCount = folders.filter((f) => f.parentId === folder.id).length;
  const parts = [
    `${boardCount} ${boardCount === 1 ? "quadro" : "quadros"}`,
    subCount > 0 && `${subCount} ${subCount === 1 ? "subpasta" : "subpastas"}`,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => actions.openFolder(folder.id)}
      className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-3 text-left transition hover:border-ink-faint hover:shadow-sm"
    >
      <ItemIcon kind="folder" icon={folder.icon} color={folder.color} size={24} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{folder.name}</span>
        <span className="block truncate text-xs text-ink-faint">{parts.join(" · ")}</span>
      </span>
    </button>
  );
}

function NewButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink-soft hover:border-ink-faint hover:text-ink"
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">{title}</h2>
      {children}
    </section>
  );
}

const BOARD_GRID = "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4";
const FOLDER_GRID = "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3";

// ---------- Tela inicial ----------

type HomeGalleryProps = {
  userName: string;
  folders: Folder[];
  boards: Board[];
  thumbnails: Record<string, string | null>;
  actions: GalleryActions;
};

export function HomeGallery({ userName, folders, boards, thumbnails, actions }: HomeGalleryProps) {
  // Hora fixa ao montar: evita o texto mudar enquanto a tela está aberta
  const [hello] = useState(() => `${greeting()}, ${userName.split(" ")[0]}`);
  const recents = recentBoards(boards);
  const favorites = favoriteBoards(boards);
  const rootFolders = folders.filter((f) => f.parentId === null).sort(byPosition);
  const byId = new Map(folders.map((f) => [f.id, f]));
  const pathOf = (b: Board) =>
    ancestorFolderIds(folders, b.folderId)
      .reverse()
      .map((id) => byId.get(id)?.name)
      .join(" / ");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold text-ink">{hello}</h1>
          <div className="flex gap-2">
            <NewButton onClick={() => actions.openFolder(actions.createFolder(null))}>+ Nova pasta</NewButton>
            <button
              type="button"
              onClick={() => actions.createBoard(null)}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent hover:opacity-90"
            >
              + Novo quadro
            </button>
          </div>
        </div>

        {boards.length === 0 && folders.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
            <p className="font-display text-xl text-ink">Comece seu primeiro quadro</p>
            <p className="mt-1 text-sm text-ink-muted">Desenhe ideias, fluxos e rascunhos, e organize tudo em pastas.</p>
            <button
              type="button"
              onClick={() => actions.createBoard(null)}
              className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90"
            >
              Criar quadro
            </button>
          </div>
        ) : (
          <>
            {recents.length > 0 && (
              <Section title="Recentes">
                <div className={BOARD_GRID}>
                  {recents.map((b) => (
                    <BoardCard key={b.id} board={b} thumbnail={thumbnails[b.id]} path={pathOf(b)} actions={actions} />
                  ))}
                </div>
              </Section>
            )}

            {favorites.length > 0 && (
              <Section title="Favoritos">
                <div className={BOARD_GRID}>
                  {favorites.map((b) => (
                    <BoardCard key={b.id} board={b} thumbnail={thumbnails[b.id]} path={pathOf(b)} actions={actions} />
                  ))}
                </div>
              </Section>
            )}

            {rootFolders.length > 0 && (
              <Section title="Pastas">
                <div className={FOLDER_GRID}>
                  {rootFolders.map((f) => (
                    <FolderCard key={f.id} folder={f} folders={folders} boards={boards} actions={actions} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Pasta aberta ----------

type FolderGalleryProps = {
  folder: Folder;
  folders: Folder[];
  boards: Board[];
  thumbnails: Record<string, string | null>;
  actions: GalleryActions;
  onEditIcon: (kind: "folder" | "board", id: string, x: number, y: number) => void;
};

export function FolderGallery({ folder, folders, boards, thumbnails, actions, onEditIcon }: FolderGalleryProps) {
  const [renaming, setRenaming] = useState(false);
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail = ancestorFolderIds(folders, folder.parentId)
    .reverse()
    .map((id) => byId.get(id))
    .filter((f): f is Folder => !!f);
  const subfolders = folders.filter((f) => f.parentId === folder.id).sort(byPosition);
  const folderBoards = boards.filter((b) => b.folderId === folder.id).sort(byPosition);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Caminho: Início / Pasta / Subpasta */}
        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <button type="button" onClick={actions.openHome} className="rounded px-1 hover:bg-hover hover:text-ink">
            Início
          </button>
          {trail.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <span className="text-ink-faint">/</span>
              <button type="button" onClick={() => actions.openFolder(f.id)} className="rounded px-1 hover:bg-hover hover:text-ink">
                {f.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              title="Mudar ícone e cor"
              aria-label="Mudar ícone e cor da pasta"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onEditIcon("folder", folder.id, rect.left, rect.bottom + 4);
              }}
              className="rounded-md p-1 hover:bg-hover"
            >
              <ItemIcon kind="folder" open icon={folder.icon} color={folder.color} size={30} />
            </button>
            {renaming ? (
              <RenameInput
                initial={folder.name}
                onCommit={(name) => {
                  actions.renameFolder(folder.id, name);
                  setRenaming(false);
                }}
                onCancel={() => setRenaming(false)}
                className="w-96 max-w-full rounded border border-accent bg-panel px-2 py-0.5 font-display text-2xl font-semibold text-ink outline-none ring-2 ring-accent-soft"
              />
            ) : (
              <h1
                title="Clique para renomear"
                onClick={() => setRenaming(true)}
                className="cursor-text truncate rounded px-1 font-display text-3xl font-semibold text-ink hover:bg-hover"
              >
                {folder.name}
              </h1>
            )}
          </div>
          <div className="flex gap-2">
            <NewButton onClick={() => actions.openFolder(actions.createFolder(folder.id))}>+ Nova subpasta</NewButton>
            <button
              type="button"
              onClick={() => actions.createBoard(folder.id)}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent hover:opacity-90"
            >
              + Novo quadro
            </button>
          </div>
        </div>

        {subfolders.length === 0 && folderBoards.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="font-display text-lg text-ink">Esta pasta está vazia</p>
            <p className="mt-1 text-sm text-ink-muted">Crie um quadro aqui ou arraste um da barra lateral.</p>
          </div>
        ) : (
          <>
            {subfolders.length > 0 && (
              <Section title="Subpastas">
                <div className={FOLDER_GRID}>
                  {subfolders.map((f) => (
                    <FolderCard key={f.id} folder={f} folders={folders} boards={boards} actions={actions} />
                  ))}
                </div>
              </Section>
            )}
            {folderBoards.length > 0 && (
              <Section title="Quadros">
                <div className={BOARD_GRID}>
                  {folderBoards.map((b) => (
                    <BoardCard key={b.id} board={b} thumbnail={thumbnails[b.id]} actions={actions} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
