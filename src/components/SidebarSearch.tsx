"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ItemIcon from "@/components/ItemIcon";
import type { ColorKey } from "@/lib/appearance";
import { ancestorFolderIds, byName } from "@/lib/tree";
import type { Board, Folder } from "@/lib/types";

type Result = {
  kind: "folder" | "board";
  id: string;
  name: string;
  path: string;
  matchAt: number;
  icon: string | null;
  color: ColorKey | null;
};

/** Minúsculas e sem acentos: "Reunião" encontra "reuniao". */
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type SidebarSearchProps = {
  folders: Folder[];
  boards: Board[];
  onOpenBoard: (id: string) => void;
  onRevealFolder: (id: string) => void;
  /** A árvore normal, mostrada quando a busca está vazia. */
  children: React.ReactNode;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export default function SidebarSearch({ folders, boards, onOpenBoard, onRevealFolder, children }: SidebarSearchProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ⌘P / Ctrl+P foca a busca (o ⌘K já é usado pelo editor para inserir links).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    const pathOf = (folderId: string | null) =>
      ancestorFolderIds(folders, folderId)
        .reverse()
        .map((id) => byId.get(id)?.name ?? "")
        .join(" / ");

    const match = <T extends { name: string }>(items: T[]) =>
      items
        .map((item) => ({ item, at: normalize(item.name).indexOf(q) }))
        .filter((m) => m.at >= 0)
        // Primeiro quem começa com o termo, depois ordem alfabética
        .sort((a, b) => Number(a.at !== 0) - Number(b.at !== 0) || byName(a.item, b.item));

    return [
      ...match(boards).map(({ item, at }) => ({
        kind: "board" as const,
        id: item.id,
        name: item.name,
        path: pathOf(item.folderId),
        matchAt: at,
        icon: item.icon,
        color: item.color,
      })),
      ...match(folders).map(({ item, at }) => ({
        kind: "folder" as const,
        id: item.id,
        name: item.name,
        path: pathOf(item.parentId),
        matchAt: at,
        icon: item.icon,
        color: item.color,
      })),
    ];
  }, [query, folders, boards]);

  const qLength = query.trim().length;
  const current = Math.min(active, Math.max(results.length - 1, 0));

  const open = (r: Result) => {
    setQuery("");
    setActive(0);
    if (r.kind === "board") onOpenBoard(r.id);
    else onRevealFolder(r.id);
    inputRef.current?.blur();
  };

  const moveActive = (delta: number) => {
    if (!results.length) return;
    const next = (current + delta + results.length) % results.length;
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <>
      <div className="px-2 pb-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                moveActive(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveActive(-1);
              } else if (e.key === "Enter" && results[current]) {
                open(results[current]);
              } else if (e.key === "Escape") {
                setQuery("");
                inputRef.current?.blur();
              }
            }}
            placeholder="Buscar…"
            aria-label="Buscar pastas e quadros"
            className="w-full rounded-md border border-line bg-panel py-1.5 pl-2.5 pr-10 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-sidebar px-1 font-sans text-[10px] text-ink-faint">
            {isMac ? "⌘P" : "Ctrl P"}
          </kbd>
        </div>
      </div>

      {qLength === 0 ? (
        children
      ) : (
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {results.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-ink-faint">Nada encontrado para “{query.trim()}”.</p>
          ) : (
            <ul ref={listRef} role="listbox" aria-label="Resultados da busca">
              {results.map((r, i) => (
                <li
                  key={`${r.kind}-${r.id}`}
                  role="option"
                  aria-selected={i === current}
                  onMouseEnter={() => setActive(i)}
                  // mousedown para abrir antes do input perder o foco
                  onMouseDown={(e) => {
                    e.preventDefault();
                    open(r);
                  }}
                  className={`flex cursor-pointer items-start gap-1.5 rounded-md px-2 py-1.5 text-sm ${
                    i === current ? "bg-selected" : ""
                  }`}
                >
                  <ItemIcon kind={r.kind} icon={r.icon} color={r.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">
                      {r.name.slice(0, r.matchAt)}
                      <mark className="rounded-sm bg-highlight text-ink">{r.name.slice(r.matchAt, r.matchAt + qLength)}</mark>
                      {r.name.slice(r.matchAt + qLength)}
                    </span>
                    {r.path && <span className="block truncate text-xs text-ink-faint">{r.path}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
