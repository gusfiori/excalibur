import type { Scene } from "@/components/Editor";
import { blobToDataURL } from "@/lib/files";

const MAX_SIZE = 480; // px no lado maior: suficiente para os cards da galeria
const MAX_LENGTH = 400_000; // ~300 KB: acima disso não vale guardar como miniatura

/**
 * Gera a prévia do quadro (imagem WebP pequena, fundo transparente) para a
 * galeria. Devolve null quando o quadro está vazio.
 */
export async function renderThumbnail(scene: Scene): Promise<string | null> {
  const elements = scene.elements.filter((el) => !el.isDeleted);
  if (elements.length === 0) return null;

  // Import dinâmico: o Excalidraw só funciona no navegador
  const { exportToBlob } = await import("@excalidraw/excalidraw");
  const blob = await exportToBlob({
    elements,
    files: scene.files,
    appState: { exportBackground: false, viewBackgroundColor: "transparent" },
    mimeType: "image/webp",
    quality: 0.8,
    maxWidthOrHeight: MAX_SIZE,
    exportPadding: 16,
  });
  const dataURL = await blobToDataURL(blob);
  return dataURL.length <= MAX_LENGTH ? dataURL : null;
}
