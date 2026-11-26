/**
 * Modelos prontos e biblioteca de elementos do Excalibur.
 *
 * Tudo é descrito em "esqueletos" (formas com texto dentro, setas ligando
 * formas pelo id) e convertido em elementos do Excalidraw na hora, já com o
 * estilo do tema (traço à mão ou limpo, fonte e cantos).
 */
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { LibraryItem } from "@excalidraw/excalidraw/types";
import { THEMES, type ThemeId } from "@/lib/themes";

type Style = (typeof THEMES)[ThemeId]["drawing"];
type Skeleton = ExcalidrawElementSkeleton;

const INK = "#1e1e1e";
/** Cores de preenchimento da paleta do Excalidraw (claras, boas para texto escuro). */
const FILL = {
  yellow: "#ffec99",
  blue: "#a5d8ff",
  green: "#b2f2bb",
  red: "#ffc9c9",
  violet: "#d0bfff",
  orange: "#ffd8a8",
  teal: "#96f2d7",
  pink: "#fcc2d7",
  gray: "#e9ecef",
  // fundos bem suaves (colunas, quadrantes)
  softGray: "#f8f9fa",
  softGreen: "#ebfbee",
  softRed: "#fff5f5",
  softBlue: "#e7f5ff",
  softYellow: "#fff9db",
};

// ---------- Peças básicas ----------

type BoxOpts = {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fill?: string;
  shape?: "rectangle" | "ellipse" | "diamond";
  fontSize?: number;
  /** Texto no topo da forma (títulos de colunas/quadrantes) */
  top?: boolean;
  dashed?: boolean;
  strokeWidth?: number;
};

function box(s: Style, o: BoxOpts): Skeleton {
  const shape = o.shape ?? "rectangle";
  const roundness =
    shape === "ellipse" ? null : s.roundness === "round" ? { type: shape === "rectangle" ? 3 : 2 } : null;
  return {
    type: shape,
    id: o.id,
    x: o.x,
    y: o.y,
    width: o.w,
    height: o.h,
    strokeColor: INK,
    backgroundColor: o.fill ?? "transparent",
    fillStyle: "solid",
    strokeWidth: o.strokeWidth ?? 2,
    strokeStyle: o.dashed ? "dashed" : "solid",
    roughness: s.roughness,
    roundness,
    ...(o.text
      ? {
          label: {
            text: o.text,
            fontSize: o.fontSize ?? 20,
            fontFamily: s.fontFamily,
            ...(o.top ? { verticalAlign: "top" as const } : {}),
          },
        }
      : {}),
  } as Skeleton;
}

type Side = "top" | "bottom" | "left" | "right";
type Point = { x: number; y: number };

/** Ponto no meio de um lado da forma (em elipses e losangos, é a ponta da forma). */
function sidePoint(b: BoxOpts, side: Side): Point {
  if (side === "top") return { x: b.x + b.w / 2, y: b.y };
  if (side === "bottom") return { x: b.x + b.w / 2, y: b.y + b.h };
  if (side === "left") return { x: b.x, y: b.y + b.h / 2 };
  return { x: b.x + b.w, y: b.y + b.h / 2 };
}

/**
 * Seta (ou linha, com head: false) ligando duas formas de borda a borda.
 * O lado de saída/chegada é escolhido pela direção, ou informado em from/to;
 * `via` são pontos de dobra no meio do caminho.
 */
function connect(
  s: Style,
  a: BoxOpts,
  b: BoxOpts,
  o: { text?: string; head?: boolean; from?: Side; to?: Side; via?: Point[] } = {},
): Skeleton {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const vertical = Math.abs(dy) >= Math.abs(dx);
  const from = o.from ?? (vertical ? (dy > 0 ? "bottom" : "top") : dx > 0 ? "right" : "left");
  const to = o.to ?? (vertical ? (dy > 0 ? "top" : "bottom") : dx > 0 ? "left" : "right");
  const p0 = sidePoint(a, from);
  const path = [p0, ...(o.via ?? []), sidePoint(b, to)];
  return {
    type: "arrow",
    x: p0.x,
    y: p0.y,
    points: path.map((p) => [p.x - p0.x, p.y - p0.y]),
    start: { id: a.id },
    end: { id: b.id },
    strokeColor: INK,
    strokeWidth: 2,
    roughness: s.roughness,
    endArrowhead: o.head === false ? null : "arrow",
    ...(o.text ? { label: { text: o.text, fontSize: 16, fontFamily: s.fontFamily } } : {}),
  } as Skeleton;
}

function line(s: Style, x: number, y: number, points: [number, number][], width = 2): Skeleton {
  return {
    type: "line",
    x,
    y,
    points,
    strokeColor: INK,
    strokeWidth: width,
    roughness: s.roughness,
  } as Skeleton;
}

function text(s: Style, x: number, y: number, value: string, fontSize = 20): Skeleton {
  return { type: "text", x, y, text: value, fontSize, fontFamily: s.fontFamily, strokeColor: INK } as Skeleton;
}

// ---------- Modelos ----------

function mindMap(s: Style): Skeleton[] {
  const fills = [FILL.blue, FILL.green, FILL.red, FILL.violet, FILL.orange, FILL.teal];
  const rows = [-150, 25, 200];
  const center: BoxOpts = { id: "centro", x: 0, y: 0, w: 260, h: 130, text: "Ideia central", fill: FILL.yellow, shape: "ellipse", fontSize: 26 };
  const branches: BoxOpts[] = [...rows.map((y) => ({ x: -360, y })), ...rows.map((y) => ({ x: 480, y }))].map((p, i) => ({
    id: `t${i}`,
    x: p.x,
    y: p.y,
    w: 200,
    h: 80,
    text: `Tópico ${i + 1}`,
    fill: fills[i],
  }));
  return [
    box(s, center),
    ...branches.flatMap((b) => [box(s, b), connect(s, center, b, { head: false })]),
  ];
}

function flowchart(s: Style): Skeleton[] {
  const inicio: BoxOpts = { id: "inicio", x: 0, y: 0, w: 200, h: 70, text: "Início", fill: FILL.green, shape: "ellipse" };
  const passo: BoxOpts = { id: "passo", x: 0, y: 140, w: 200, h: 80, text: "Faça algo", fill: FILL.blue };
  const decisao: BoxOpts = { id: "decisao", x: -20, y: 290, w: 240, h: 150, text: "Deu certo?", fill: FILL.yellow, shape: "diamond" };
  const ajuste: BoxOpts = { id: "ajuste", x: 340, y: 325, w: 200, h: 80, text: "Ajuste", fill: FILL.orange };
  const fim: BoxOpts = { id: "fim", x: 0, y: 520, w: 200, h: 70, text: "Fim", fill: FILL.red, shape: "ellipse" };
  return [
    ...[inicio, passo, decisao, ajuste, fim].map((b) => box(s, b)),
    connect(s, inicio, passo),
    connect(s, passo, decisao),
    connect(s, decisao, fim, { text: "Sim" }),
    connect(s, decisao, ajuste, { text: "Não" }),
    // Volta para "Faça algo": sobe pela direita e entra pelo lado
    connect(s, ajuste, passo, { from: "top", to: "right", via: [{ x: 440, y: 180 }] }),
  ];
}

function kanban(s: Style): Skeleton[] {
  const columns = [
    { title: "A fazer", cards: ["Tarefa 1", "Tarefa 2", "Tarefa 3"], fill: FILL.yellow },
    { title: "Fazendo", cards: ["Tarefa 4", "Tarefa 5"], fill: FILL.blue },
    { title: "Feito", cards: ["Tarefa 6"], fill: FILL.green },
  ];
  return columns.flatMap((col, c) => {
    const x = c * 330;
    return [
      box(s, { x, y: 0, w: 300, h: 560, text: col.title, fill: FILL.softGray, fontSize: 26, top: true, strokeWidth: 1 }),
      ...col.cards.map((card, i) => box(s, { x: x + 25, y: 70 + i * 110, w: 250, h: 90, text: card, fill: col.fill, fontSize: 18 })),
    ];
  });
}

function phoneWireframe(s: Style): Skeleton[] {
  return [
    box(s, { x: 0, y: 0, w: 320, h: 640 }),
    box(s, { x: 125, y: 14, w: 70, h: 10, fill: FILL.gray, strokeWidth: 1 }),
    box(s, { x: 20, y: 40, w: 280, h: 48, text: "Título do app", fill: FILL.gray, fontSize: 18 }),
    box(s, { x: 20, y: 104, w: 280, h: 170, dashed: true }),
    line(s, 20, 104, [
      [0, 0],
      [280, 170],
    ], 1),
    line(s, 300, 104, [
      [0, 0],
      [-280, 170],
    ], 1),
    text(s, 20, 296, "Título da seção", 22),
    line(s, 20, 344, [[0, 0], [280, 0]]),
    line(s, 20, 372, [[0, 0], [250, 0]]),
    line(s, 20, 400, [[0, 0], [200, 0]]),
    box(s, { x: 20, y: 440, w: 280, h: 54, text: "Botão", fill: FILL.blue, fontSize: 18 }),
    box(s, { x: 0, y: 576, w: 320, h: 64, text: "Início     Buscar     Perfil", fill: FILL.softGray, fontSize: 14, strokeWidth: 1 }),
  ];
}

function timeline(s: Style): Skeleton[] {
  const steps = ["Etapa 1", "Etapa 2", "Etapa 3", "Etapa 4", "Etapa 5"];
  const fills = [FILL.blue, FILL.green, FILL.yellow, FILL.orange, FILL.violet];
  return [
    {
      type: "arrow",
      x: 0,
      y: 220,
      points: [
        [0, 0],
        [1080, 0],
      ],
      strokeColor: INK,
      strokeWidth: 3,
      roughness: s.roughness,
    } as Skeleton,
    ...steps.flatMap((label, i) => {
      const cx = 110 + i * 210;
      const above = i % 2 === 0;
      return [
        box(s, { x: cx - 13, y: 207, w: 26, h: 26, fill: fills[i], shape: "ellipse" }),
        line(s, cx, above ? 207 : 233, [[0, 0], [0, above ? -57 : 57]], 1),
        box(s, { x: cx - 90, y: above ? 60 : 290, w: 180, h: 90, text: `${label}\nDescrição`, fill: fills[i], fontSize: 18 }),
      ];
    }),
  ];
}

function retrospective(s: Style): Skeleton[] {
  const quads = [
    { title: "😀 O que foi bem", fill: FILL.softGreen, x: 0, y: 0 },
    { title: "😕 O que melhorar", fill: FILL.softRed, x: 460, y: 0 },
    { title: "💡 Ideias", fill: FILL.softBlue, x: 0, y: 340 },
    { title: "✅ Ações", fill: FILL.softYellow, x: 460, y: 340 },
  ];
  return quads.flatMap((q) => [
    box(s, { x: q.x, y: q.y, w: 440, h: 320, text: q.title, fill: q.fill, fontSize: 24, top: true, strokeWidth: 1 }),
    box(s, { x: q.x + 30, y: q.y + 80, w: 170, h: 100, text: "Escreva aqui", fill: FILL.yellow, fontSize: 16 }),
    box(s, { x: q.x + 230, y: q.y + 80, w: 170, h: 100, text: "Escreva aqui", fill: FILL.yellow, fontSize: 16 }),
  ]);
}

export const TEMPLATES = [
  { id: "mapa-mental", name: "Mapa mental", build: mindMap },
  { id: "fluxograma", name: "Fluxograma", build: flowchart },
  { id: "kanban", name: "Kanban", build: kanban },
  { id: "wireframe", name: "Wireframe de celular", build: phoneWireframe },
  { id: "linha-do-tempo", name: "Linha do tempo", build: timeline },
  { id: "retrospectiva", name: "Retrospectiva", build: retrospective },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

/** Elementos prontos do modelo, no estilo do tema. Só roda no navegador. */
export async function buildTemplate(id: TemplateId, theme: ThemeId) {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const template = TEMPLATES.find((t) => t.id === id)!;
  return convertToExcalidrawElements(template.build(THEMES[theme].drawing), { regenerateIds: true });
}

// ---------- Desenho de boas-vindas (página inicial) ----------

function welcome(s: Style): Skeleton[] {
  const ideia: BoxOpts = { id: "ideia", x: 0, y: 90, w: 170, h: 80, text: "Uma ideia", fill: FILL.yellow };
  const plano: BoxOpts = { id: "plano", x: 260, y: 70, w: 190, h: 120, text: "Um plano", fill: FILL.blue, shape: "ellipse" };
  const feito: BoxOpts = { id: "feito", x: 540, y: 90, w: 150, h: 80, text: "Feito!", fill: FILL.green };
  return [
    text(s, 0, 0, "Oi! Rabisque à vontade ✏️", 32),
    box(s, ideia),
    box(s, plano),
    box(s, feito),
    connect(s, ideia, plano),
    connect(s, plano, feito),
    box(s, {
      x: 120,
      y: 250,
      w: 450,
      h: 90,
      text: "Nada se perde: entre com Google\ne isto vira seu primeiro quadro",
      fill: FILL.pink,
      fontSize: 18,
    }),
  ];
}

/** Quadro de exemplo da página inicial, no estilo do tema. Só roda no navegador. */
export async function buildWelcome(theme: ThemeId) {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  return convertToExcalidrawElements(welcome(THEMES[theme].drawing), { regenerateIds: true });
}

// ---------- Biblioteca de elementos (painel "Biblioteca" do editor) ----------

function libraryItems(s: Style): { name: string; skeleton: Skeleton[] }[] {
  const note = (fill: string) => [box(s, { x: 0, y: 0, w: 180, h: 140, text: "Nota", fill, fontSize: 20 })];
  return [
    { name: "Post-it amarelo", skeleton: note(FILL.yellow) },
    { name: "Post-it rosa", skeleton: note(FILL.pink) },
    { name: "Post-it azul", skeleton: note(FILL.blue) },
    { name: "Post-it verde", skeleton: note(FILL.green) },
    {
      name: "Balão de fala",
      skeleton: [
        box(s, { x: 0, y: 0, w: 200, h: 100, text: "Olá!", fill: "#ffffff" }),
        line(s, 40, 100, [
          [0, 0],
          [-10, 34],
          [34, 0],
        ]),
      ],
    },
    { name: "Etiqueta", skeleton: [box(s, { x: 0, y: 0, w: 120, h: 40, text: "Etiqueta", fill: FILL.violet, fontSize: 16 })] },
    { name: "Botão", skeleton: [box(s, { x: 0, y: 0, w: 160, h: 50, text: "Botão", fill: FILL.blue, fontSize: 18 })] },
    {
      name: "Item de lista",
      skeleton: [box(s, { x: 0, y: 4, w: 24, h: 24 }), text(s, 38, 2, "Item da lista", 20)],
    },
    {
      name: "Pessoa",
      skeleton: [
        box(s, { x: 20, y: 0, w: 40, h: 40, shape: "ellipse" }),
        line(s, 40, 40, [[0, 0], [0, 60]]),
        line(s, 10, 60, [[0, 0], [60, 0]]),
        line(s, 40, 100, [[0, 0], [-25, 40]]),
        line(s, 40, 100, [[0, 0], [25, 40]]),
      ],
    },
    {
      name: "Seta grossa",
      skeleton: [
        {
          type: "arrow",
          x: 0,
          y: 0,
          points: [
            [0, 0],
            [200, 0],
          ],
          strokeColor: INK,
          strokeWidth: 4,
          roughness: s.roughness,
        } as Skeleton,
      ],
    },
    ...["⭐", "✅", "❌", "❓", "💡", "🔥"].map((emoji) => ({ name: emoji, skeleton: [text(s, 0, 0, emoji, 48)] })),
  ];
}

/** Itens da biblioteca do Excalibur, no estilo do tema. Só roda no navegador. */
export async function buildLibrary(theme: ThemeId): Promise<LibraryItem[]> {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const created = Date.UTC(2026, 10, 26);
  return libraryItems(THEMES[theme].drawing).map((item, i) => ({
    id: `excalibur-${theme}-${i}`,
    status: "unpublished" as const,
    name: item.name,
    created,
    elements: convertToExcalidrawElements(item.skeleton, { regenerateIds: true }),
  }));
}
