import { createClient } from "@/lib/supabase/client";
import type { Scene } from "@/components/Editor";
import type { Board, Folder } from "@/lib/types";

// Todas as consultas rodam com a sessão do usuário; o Row Level Security do
// banco garante que cada pessoa só enxerga e altera os próprios dados.
const supabase = () => createClient();

type FolderRow = { id: string; name: string; parent_id: string | null; position: number };
type BoardRow = { id: string; name: string; folder_id: string | null; position: number };

const toFolder = (r: FolderRow): Folder => ({ id: r.id, name: r.name, parentId: r.parent_id, position: r.position });
const toBoard = (r: BoardRow): Board => ({ id: r.id, name: r.name, folderId: r.folder_id, position: r.position });

/** Quando o RLS bloqueia, o Supabase não dá erro: só não altera nenhuma linha. */
function ensureChanged(data: unknown[] | null) {
  if (!data || data.length === 0) throw new Error("Nada foi alterado (item não encontrado ou sem permissão).");
}

// ---------- Árvore (sidebar) ----------

export async function listTree(): Promise<{ folders: Folder[]; boards: Board[] }> {
  const db = supabase();
  const [folders, boards] = await Promise.all([
    db.from("folders").select("id, name, parent_id, position").order("position").order("created_at"),
    db.from("boards").select("id, name, folder_id, position").order("position").order("created_at"),
  ]);
  if (folders.error) throw folders.error;
  if (boards.error) throw boards.error;
  return { folders: folders.data.map(toFolder), boards: boards.data.map(toBoard) };
}

// ---------- Pastas ----------

export async function createFolder(folder: Folder): Promise<void> {
  const { error } = await supabase()
    .from("folders")
    .insert({ id: folder.id, name: folder.name, parent_id: folder.parentId, position: folder.position });
  if (error) throw error;
}

export async function updateFolder(id: string, patch: { name?: string; parentId?: string | null }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId;
  const { data, error } = await supabase().from("folders").update(row).eq("id", id).select("id");
  if (error) throw error;
  ensureChanged(data);
}

/** Apaga a pasta; o banco apaga em cascata as subpastas e quadros dentro dela. */
export async function deleteFolder(id: string): Promise<void> {
  const { data, error } = await supabase().from("folders").delete().eq("id", id).select("id");
  if (error) throw error;
  ensureChanged(data);
}

// ---------- Quadros ----------

export async function createBoard(board: Board): Promise<void> {
  const { error } = await supabase()
    .from("boards")
    .insert({ id: board.id, name: board.name, folder_id: board.folderId, position: board.position });
  if (error) throw error;
}

export async function updateBoard(id: string, patch: { name?: string; folderId?: string | null }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.folderId !== undefined) row.folder_id = patch.folderId;
  const { data, error } = await supabase().from("boards").update(row).eq("id", id).select("id");
  if (error) throw error;
  ensureChanged(data);
}

export async function deleteBoard(id: string): Promise<void> {
  const { data, error } = await supabase().from("boards").delete().eq("id", id).select("id");
  if (error) throw error;
  ensureChanged(data);
}

// ---------- Conteúdo do quadro (desenho) ----------

export async function getBoardScene(id: string): Promise<Scene> {
  const { data, error } = await supabase().from("boards").select("elements, app_state, files").eq("id", id).single();
  if (error) throw error;
  return { elements: data.elements ?? [], appState: data.app_state ?? {}, files: data.files ?? {} };
}

export async function saveBoardScene(id: string, scene: Scene): Promise<void> {
  const { error } = await supabase()
    .from("boards")
    .update({ elements: scene.elements, app_state: scene.appState, files: scene.files })
    .eq("id", id);
  if (error) throw error;
}
