"use client";

import { useState } from "react";
import type { Board, Folder, UserInfo } from "@/lib/types";

type SidebarProps = {
  folders: Folder[];
  boards: Board[];
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  user: UserInfo;
};

export default function Sidebar({ folders, boards, activeBoardId, onSelectBoard, user }: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderLevel = (parentId: string | null, depth: number) => {
    const childFolders = folders.filter((f) => f.parentId === parentId);
    const childBoards = boards.filter((b) => b.folderId === parentId);
    const indent = { paddingLeft: 8 + depth * 14 };

    return (
      <>
        {childFolders.map((folder) => {
          const open = expanded.has(folder.id);
          return (
            <div key={folder.id}>
              <button
                onClick={() => toggle(folder.id)}
                className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm text-zinc-700 hover:bg-zinc-200/70"
                style={indent}
              >
                <span className="w-3 text-[10px] text-zinc-400">{open ? "▼" : "▶"}</span>
                <span>📁</span>
                <span className="truncate">{folder.name}</span>
              </button>
              {open && renderLevel(folder.id, depth + 1)}
            </div>
          );
        })}
        {childBoards.map((board) => (
          <button
            key={board.id}
            onClick={() => onSelectBoard(board.id)}
            className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm hover:bg-zinc-200/70 ${
              board.id === activeBoardId ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-700"
            }`}
            style={indent}
          >
            <span className="w-3" />
            <span>✏️</span>
            <span className="truncate">{board.name}</span>
          </button>
        ))}
      </>
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="px-4 py-3 text-sm font-semibold text-zinc-900">My Excalidraw</div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">{renderLevel(null, 0)}</nav>
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
    </aside>
  );
}
