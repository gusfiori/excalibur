import type { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Imagens dos quadros ficam no Supabase Storage (bucket "board-files"), e não
 * dentro da linha do quadro no banco. No banco guardamos só os metadados.
 *
 * Caminho: <id do usuário>/<id da imagem>. O id da imagem é um hash do
 * conteúdo, então a mesma imagem em vários quadros é enviada uma vez só.
 */
const BUCKET = "board-files";

/** O que vai para a coluna `files` do quadro: tudo menos o conteúdo (dataURL). */
export type StoredFile = Omit<BinaryFileData, "dataURL"> & { dataURL?: BinaryFileData["dataURL"] };

/** Imagens que já sabemos que estão no Storage (enviadas ou baixadas nesta sessão). */
const inStorage = new Set<string>();

async function currentUserId(): Promise<string> {
  const { data } = await createClient().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Sessão expirada. Entre novamente.");
  return id;
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const alreadyExists = (error: { message?: string; statusCode?: string }) =>
  error.statusCode === "409" || /exists|duplicate/i.test(error.message ?? "");

/**
 * Envia para o Storage as imagens que ainda não estão lá e devolve os
 * metadados (sem o conteúdo) para salvar no banco.
 */
export async function uploadNewFiles(files: BinaryFiles): Promise<Record<string, StoredFile>> {
  const list = Object.values(files);
  if (list.length === 0) return {};
  const userId = await currentUserId();
  const storage = createClient().storage.from(BUCKET);

  await Promise.all(
    list.map(async (file) => {
      const path = `${userId}/${file.id}`;
      if (inStorage.has(path)) return;
      const blob = await (await fetch(file.dataURL)).blob();
      const { error } = await storage.upload(path, blob, { contentType: file.mimeType, upsert: false });
      if (error && !alreadyExists(error as { message?: string; statusCode?: string })) throw error;
      inStorage.add(path);
    }),
  );

  return Object.fromEntries(
    list.map((file) => {
      const { dataURL: _content, ...meta } = file;
      void _content;
      return [file.id, meta];
    }),
  );
}

/**
 * Transforma os metadados salvos no banco em imagens prontas para o editor,
 * baixando o conteúdo do Storage. Imagens antigas que ainda têm o conteúdo
 * no banco (dataURL) são usadas direto e migram no próximo salvamento.
 */
export async function loadFiles(stored: Record<string, StoredFile> | null | undefined): Promise<BinaryFiles> {
  const list = Object.values(stored ?? {});
  if (list.length === 0) return {};
  const userId = await currentUserId();
  const storage = createClient().storage.from(BUCKET);

  const loaded = await Promise.all(
    list.map(async (file): Promise<BinaryFileData | null> => {
      if (file.dataURL) return file as BinaryFileData;
      const path = `${userId}/${file.id}`;
      const { data, error } = await storage.download(path);
      if (error || !data) {
        console.error(`Imagem ${file.id} não encontrada no Storage`, error);
        return null; // o editor mostra um espaço vazio no lugar da imagem
      }
      inStorage.add(path);
      return { ...file, dataURL: (await blobToDataURL(data)) as BinaryFileData["dataURL"] };
    }),
  );

  return Object.fromEntries(loaded.filter((f): f is BinaryFileData => f !== null).map((f) => [f.id, f]));
}
