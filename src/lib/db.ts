import { loadFiles, uploadNewFiles } from "@/lib/files";
import { createClient } from "@/lib/supabase/client";
import type { Scene } from "@/components/Editor";
import { isColorKey } from "@/lib/appearance";
import type { Board, Folder, ItemAppearance } from "@/lib/types";

// Todas as consultas rodam com a sessão do usuário; o Row Level Security do
// banco garante que cada pessoa só enxerga e altera os próprios dados.
const supabase = () => createClient();

type AppearanceRow = { icon?: string | null; color?: string | null };
type FolderRow = { id: string; name: string; parent_id: string | null; position: number } & AppearanceRow;
type BoardRow = {
  id: string;
  name: string;
  folder_id: string | null;
  position: number;
  updated_at: string;
  favorite?: boolean;
  opened_at?: string | null;
} & AppearanceRow;

const toAppearance = (r: AppearanceRow): ItemAppearance => ({
  icon: r.icon ?? null,
  color: isColorKey(r.color) ? r.color : null,
});
const toFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  parentId: r.parent_id,
  position: r.position,
  ...toAppearance(r),
});
const toBoard = (r: BoardRow): Board => ({
  id: r.id,
  name: r.name,
  folderId: r.folder_id,
  position: r.position,
  ...toAppearance(r),
  updatedAt: r.updated_at,
  favorite: r.favorite ?? false,
  openedAt: r.opened_at ?? null,
});

/** Coluna que ainda não existe no banco (script SQL novo não rodado). */
const isMissingColumn = (e: { code?: string } | null) => e?.code === "42703" || e?.code === "PGRST204";

/** Quando o RLS bloqueia, o Supabase não dá erro: só não altera nenhuma linha. */
function ensureChanged(data: unknown[] | null) {
  if (!data || data.length === 0) throw new Error("Nada foi alterado (item não encontrado ou sem permissão).");
}

// ---------- Árvore (sidebar) ----------

export async function listTree(): Promise<{ folders: Folder[]; boards: Board[] }> {
  const db = supabase();
  const query = (folderExtra: string, boardExtra: string) =>
    Promise.all([
      db.from("folders").select(`id, name, parent_id, position${folderExtra}`).order("position").order("created_at"),
      db
        .from("boards")
        .select(`id, name, folder_id, position, updated_at${boardExtra}`)
        .order("position")
        .order("created_at"),
    ]);
  // Tenta com as colunas mais novas; se algum script SQL ainda não foi rodado,
  // carrega sem elas para o app continuar funcionando.
  let [folders, boards] = await query(", icon, color", ", icon, color, favorite, opened_at");
  if (isMissingColumn(folders.error) || isMissingColumn(boards.error)) {
    [folders, boards] = await query(", icon, color", ", icon, color");
  }
  if (isMissingColumn(folders.error) || isMissingColumn(boards.error)) [folders, boards] = await query("", "");
  if (folders.error) throw folders.error;
  if (boards.error) throw boards.error;
  return {
    folders: (folders.data as unknown as FolderRow[]).map(toFolder),
    boards: (boards.data as unknown as BoardRow[]).map(toBoard),
  };
}

// ---------- Pastas ----------

export async function createFolder(folder: Folder): Promise<void> {
  const { error } = await supabase()
    .from("folders")
    .insert({ id: folder.id, name: folder.name, parent_id: folder.parentId, position: folder.position });
  if (error) throw error;
}

export async function updateFolder(
  id: string,
  patch: { name?: string; parentId?: string | null; position?: number } & Partial<ItemAppearance>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId;
  if (patch.position !== undefined) row.position = patch.position;
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

export async function updateBoard(
  id: string,
  patch: { name?: string; folderId?: string | null; position?: number } & Partial<ItemAppearance>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.folderId !== undefined) row.folder_id = patch.folderId;
  if (patch.position !== undefined) row.position = patch.position;
  const { data, error } = await supabase().from("boards").update(row).eq("id", id).select("id");
  if (error) throw error;
  ensureChanged(data);
}

export async function deleteBoard(id: string): Promise<void> {
  const { data, error } = await supabase().from("boards").delete().eq("id", id).select("id");
  if (error) throw error;
  ensureChanged(data);
}

/** Cria uma cópia do quadro (com o desenho) usando o id/nome informados. */
export async function duplicateBoard(sourceId: string, copy: Board): Promise<void> {
  const db = supabase();
  const { data, error } = await db.from("boards").select("elements, app_state, files").eq("id", sourceId).single();
  if (error) throw error;
  const { error: insertError } = await db.from("boards").insert({
    id: copy.id,
    name: copy.name,
    folder_id: copy.folderId,
    position: copy.position,
    elements: data.elements,
    app_state: data.app_state,
    files: data.files,
    // Só envia ícone/cor se tiver (funciona mesmo antes do script 0003)
    ...(copy.icon ? { icon: copy.icon } : {}),
    ...(copy.color ? { color: copy.color } : {}),
  });
  if (insertError) throw insertError;
}

/** Favorita/desfavorita e marca quando o quadro foi aberto (não contam como edição). */
export async function updateBoardMeta(id: string, patch: { favorite?: boolean; openedAt?: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.favorite !== undefined) row.favorite = patch.favorite;
  if (patch.openedAt !== undefined) row.opened_at = patch.openedAt;
  const { error } = await supabase().from("boards").update(row).eq("id", id);
  if (error) throw error;
}

// ---------- Miniaturas ----------

/** Miniaturas (data URL) dos quadros pedidos; null = quadro vazio ou ainda sem miniatura. */
export async function getThumbnails(ids: string[]): Promise<Record<string, string | null>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase().from("boards").select("id, thumbnail").in("id", ids);
  if (error) {
    if (isMissingColumn(error)) return Object.fromEntries(ids.map((id) => [id, null]));
    throw error;
  }
  const rows = data as unknown as { id: string; thumbnail: string | null }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.thumbnail]));
}

export async function saveThumbnail(id: string, thumbnail: string | null): Promise<void> {
  const { error } = await supabase().from("boards").update({ thumbnail }).eq("id", id);
  if (error && !isMissingColumn(error)) throw error;
}

// ---------- Conteúdo do quadro (desenho) ----------

export async function getBoardScene(id: string): Promise<Scene> {
  const { data, error } = await supabase().from("boards").select("elements, app_state, files").eq("id", id).single();
  if (error) throw error;
  return { elements: data.elements ?? [], appState: data.app_state ?? {}, files: await loadFiles(data.files) };
}

export async function saveBoardScene(id: string, scene: Scene): Promise<void> {
  // Imagens vão para o Storage; no banco ficam só os metadados.
  const files = await uploadNewFiles(scene.files);
  const { error } = await supabase()
    .from("boards")
    .update({ elements: scene.elements, app_state: scene.appState, files })
    .eq("id", id);
  if (error) throw error;
}
