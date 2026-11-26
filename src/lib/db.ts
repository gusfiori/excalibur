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

export async function createBoard(name: string, folderId: string | null = null): Promise<Board> {
  const { data, error } = await supabase()
    .from("boards")
    .insert({ name, folder_id: folderId })
    .select("id, name, folder_id, position")
    .single();
  if (error) throw error;
  return toBoard(data);
}

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
