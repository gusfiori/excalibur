"use client";

import { useState } from "react";
import ItemIcon from "@/components/ItemIcon";
import type { ColorKey } from "@/lib/appearance";

type Doodle = "mind" | "timeline" | "boxes" | "list" | "flow" | "kanban";

const FOLDERS: {
  id: string;
  name: string;
  icon: string;
  color: ColorKey;
  boards: { name: string; icon: string; doodle: Doodle; when: string }[];
}[] = [
  {
    id: "estudos",
    name: "Estudos",
    icon: "📚",
    color: "blue",
    boards: [
      { name: "Resumo de Biologia", icon: "🧪", doodle: "mind", when: "editado há 2 horas" },
      { name: "Cronograma de provas", icon: "🗓️", doodle: "timeline", when: "editado ontem" },
      { name: "Fórmulas de Física", icon: "🧮", doodle: "boxes", when: "editado há 3 dias" },
    ],
  },
  {
    id: "viagem",
    name: "Viagem ao Chile",
    icon: "✈️",
    color: "orange",
    boards: [
      { name: "Roteiro dia a dia", icon: "🗺️", doodle: "timeline", when: "editado agora mesmo" },
      { name: "O que levar", icon: "🎒", doodle: "list", when: "editado há 1 hora" },
      { name: "Orçamento", icon: "💰", doodle: "boxes", when: "editado ontem" },
    ],
  },
  {
    id: "trabalho",
    name: "Trabalho",
    icon: "💼",
    color: "teal",
    boards: [
      { name: "Fluxo do app", icon: "📱", doodle: "flow", when: "editado há 20 minutos" },
      { name: "Tarefas da semana", icon: "✅", doodle: "kanban", when: "editado hoje" },
      { name: "Ideias soltas", icon: "💡", doodle: "mind", when: "editado há 2 dias" },
    ],
  },
  {
    id: "casa",
    name: "Casa nova",
    icon: "🏠",
    color: "pink",
    boards: [
      { name: "Planta da sala", icon: "🛋️", doodle: "boxes", when: "editado há 4 dias" },
      { name: "Lista de compras", icon: "🛒", doodle: "list", when: "editado ontem" },
    ],
  },
];

/** Rabisquinhos que fazem de conta que são o desenho de cada quadro. */
function DoodleArt({ kind }: { kind: Doodle }) {
  const ink = "var(--ink-soft)";
  const fill = "var(--accent-soft)";
  const common = { stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
      {kind === "mind" && (
        <g {...common}>
          <ellipse cx="80" cy="50" rx="24" ry="14" fill={fill} />
          {[[20, 18], [20, 82], [140, 18], [140, 82]].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <path d={`M80 50 Q ${(80 + x) / 2} ${y} ${x + (x < 80 ? 18 : -18)} ${y}`} fill="none" />
              <rect x={x - 16} y={y - 8} width="32" height="16" rx="4" fill="none" />
            </g>
          ))}
        </g>
      )}
      {kind === "timeline" && (
        <g {...common}>
          <path d="M10 55 H150" fill="none" />
          {[30, 65, 100, 135].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy="55" r="5" fill={fill} />
              <rect x={x - 16} y={i % 2 ? 66 : 22} width="32" height="18" rx="4" fill="none" />
            </g>
          ))}
        </g>
      )}
      {kind === "boxes" && (
        <g {...common}>
          <rect x="12" y="18" width="50" height="30" rx="5" fill={fill} />
          <rect x="98" y="18" width="50" height="30" rx="5" fill="none" />
          <rect x="55" y="62" width="50" height="28" rx="5" fill="none" />
          <path d="M62 33 H96 M88 28 l8 5 -8 5 M37 48 Q 40 76 54 76" fill="none" />
        </g>
      )}
      {kind === "list" && (
        <g {...common}>
          {[20, 44, 68].map((y, i) => (
            <g key={y}>
              <rect x="20" y={y} width="14" height="14" rx="3" fill={i === 0 ? fill : "none"} />
              {i === 0 && <path d={`M23 ${y + 7} l3 3 6 -7`} fill="none" />}
              <path d={`M44 ${y + 7} H${130 - i * 18}`} fill="none" />
            </g>
          ))}
        </g>
      )}
      {kind === "flow" && (
        <g {...common}>
          <ellipse cx="80" cy="14" rx="22" ry="9" fill={fill} />
          <rect x="58" y="36" width="44" height="18" rx="4" fill="none" />
          <path d="M80 76 l20 -12 -20 -12 -20 12z" fill="none" />
          <path d="M80 23 V36 M80 54 V52 M100 64 H130" fill="none" />
        </g>
      )}
      {kind === "kanban" && (
        <g {...common}>
          {[12, 60, 108].map((x, c) => (
            <g key={x}>
              <rect x={x} y="10" width="40" height="80" rx="5" fill="none" />
              {Array.from({ length: 3 - c }, (_, i) => (
                <rect key={i} x={x + 6} y={22 + i * 20} width="28" height="14" rx="3" fill={fill} />
              ))}
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Sidebar de mentira, mas clicável: mostra como os quadros ficam organizados. */
export default function FoldersDemo() {
  const [openId, setOpenId] = useState(FOLDERS[0].id);
  const folder = FOLDERS.find((f) => f.id === openId)!;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
      <div className="flex min-h-[340px] flex-col sm:flex-row">
        <div className="border-b border-line bg-sidebar p-3 sm:w-56 sm:border-b-0 sm:border-r">
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Suas pastas</div>
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setOpenId(f.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                f.id === openId ? "bg-selected font-medium text-ink" : "text-ink-soft hover:bg-hover"
              }`}
            >
              <ItemIcon kind="folder" icon={f.icon} color={f.color} open={f.id === openId} />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-ink-faint">{f.boards.length}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ItemIcon kind="folder" icon={folder.icon} color={folder.color} open size={22} />
            <span className="font-display text-lg font-semibold text-ink">{folder.name}</span>
          </div>
          {/* key: as cartinhas "entram" de novo a cada pasta */}
          <div key={folder.id} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {folder.boards.map((b, i) => (
              <div
                key={b.name}
                className="card-in overflow-hidden rounded-xl border border-line bg-panel"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="board-canvas aspect-[16/10] border-b border-line p-2" style={{ ["--grid-size" as string]: "10px" }}>
                  <DoodleArt kind={b.doodle} />
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-2">
                  <ItemIcon kind="board" icon={b.icon} color={null} size={14} />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-ink">{b.name}</div>
                    <div className="truncate text-[11px] text-ink-faint">{b.when}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
