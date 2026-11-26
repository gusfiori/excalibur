/**
 * Temas do Excalibur. As cores de cada tema ficam em src/app/globals.css
 * ([data-theme="..."]); aqui ficam os nomes e o estilo padrão do desenho.
 */
export const THEME_IDS = ["caderno", "estudio", "organizado"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "caderno";

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);

type ThemeInfo = {
  name: string;
  description: string;
  /** Modo do editor do Excalidraw (o escuro inverte as cores do desenho na tela). */
  editorMode: "light" | "dark";
  /** Estilo dos próximos elementos desenhados (não altera o que já existe). */
  drawing: {
    /** 0 = traço limpo, 1 = à mão, 2 = bem rabiscado */
    roughness: 0 | 1 | 2;
    /** 5 = Excalifont (à mão), 6 = Nunito (limpa) */
    fontFamily: 5 | 6;
    roundness: "round" | "sharp";
  };
};

export const THEMES: Record<ThemeId, ThemeInfo> = {
  caderno: {
    name: "Caderno",
    description: "Papel creme, fundo pontilhado e traço à mão. Aconchegante, para estudo e ideias.",
    editorMode: "light",
    drawing: { roughness: 1, fontFamily: 5, roundness: "round" },
  },
  estudio: {
    name: "Estúdio",
    description: "Escuro, quadriculado fino e traço limpo. Cara de ferramenta profissional.",
    editorMode: "dark",
    drawing: { roughness: 0, fontFamily: 6, roundness: "sharp" },
  },
  organizado: {
    name: "Organizado",
    description: "Claro, limpo e colorido, com fundo liso. O lado Notion em destaque.",
    editorMode: "light",
    drawing: { roughness: 0, fontFamily: 6, roundness: "round" },
  },
};
