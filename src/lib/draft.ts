import type { Scene } from "@/components/Editor";

/**
 * Rascunho da página inicial: o que o visitante desenha antes de criar conta
 * fica guardado no navegador e vira o primeiro quadro dele ao entrar.
 */
const KEY = "excalibur:draft";

export function saveDraft(scene: Scene) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scene));
  } catch {
    // Sem espaço (imagens grandes): guarda só os traços
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...scene, files: {} }));
    } catch {
      // sem localStorage: o rascunho só não é guardado
    }
  }
}

export function readDraft(): Scene | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const scene = JSON.parse(raw) as Scene;
    return Array.isArray(scene.elements) && scene.elements.length > 0 ? scene : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a fazer
  }
}
