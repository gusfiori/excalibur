import type { Board, Folder } from "@/lib/types";

/** A pasta e todas as subpastas dentro dela (em qualquer nível). */
export function descendantFolderIds(folders: Folder[], rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id);
        added = true;
      }
    }
  }
  return result;
}

/** Pastas acima de um item, da mais próxima até a raiz. */
export function ancestorFolderIds(folders: Folder[], folderId: string | null): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const result: string[] = [];
  let current = folderId ? byId.get(folderId) : undefined;
  while (current && !result.includes(current.id)) {
    result.push(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return result;
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
export const byName = <T extends { name: string }>(a: T, b: T) => collator.compare(a.name, b.name);

/** Gera "Sem título", "Sem título 2"... sem repetir nomes no mesmo nível. */
export function uniqueName(base: string, siblings: (Folder | Board)[]): string {
  const taken = new Set(siblings.map((s) => s.name.toLocaleLowerCase("pt-BR")));
  if (!taken.has(base.toLocaleLowerCase("pt-BR"))) return base;
  for (let i = 2; ; i++) {
    const name = `${base} ${i}`;
    if (!taken.has(name.toLocaleLowerCase("pt-BR"))) return name;
  }
}
