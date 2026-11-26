/** Cores e ícones que a pessoa pode dar para pastas e quadros. */

export const COLOR_KEYS = ["gray", "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const isColorKey = (value: unknown): value is ColorKey =>
  typeof value === "string" && (COLOR_KEYS as readonly string[]).includes(value);

/** Tons médios: ficam legíveis nos temas claros e no escuro. */
export const COLORS: Record<ColorKey, { name: string; hex: string }> = {
  gray: { name: "Cinza", hex: "#8a8780" },
  red: { name: "Vermelho", hex: "#e05252" },
  orange: { name: "Laranja", hex: "#e8833a" },
  yellow: { name: "Amarelo", hex: "#d9a520" },
  green: { name: "Verde", hex: "#4ca154" },
  teal: { name: "Verde-água", hex: "#1d9e8c" },
  blue: { name: "Azul", hex: "#3b82d6" },
  purple: { name: "Roxo", hex: "#8a6fe0" },
  pink: { name: "Rosa", hex: "#d9578f" },
};

/** Fundo suave na cor escolhida (atrás do emoji, ou dentro do ícone). */
export const softColor = (key: ColorKey, amount = 22) => `color-mix(in srgb, ${COLORS[key].hex} ${amount}%, transparent)`;

/** Emojis sugeridos no seletor (dá para colar qualquer outro). */
export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Trabalho", emojis: ["💼", "📊", "📈", "🗂️", "📌", "📎", "🗓️", "⏰", "✅", "🎯", "🚀", "🤝", "💰", "🏢", "⚙️", "🛠️"] },
  { label: "Estudo e ideias", emojis: ["📚", "📖", "📝", "✏️", "🎓", "🧠", "💡", "🧪", "🔬", "🧮", "🗺️", "🧩", "❓", "🔍", "🖍️", "🎨"] },
  { label: "Pessoal", emojis: ["🏠", "❤️", "⭐", "🔥", "🎉", "🌱", "🍀", "🌍", "✈️", "🎵", "🎮", "📷", "🎬", "☕", "🍕", "⚽"] },
  { label: "Tecnologia", emojis: ["💻", "📱", "🖥️", "🤖", "🔒", "🧑‍💻", "🌐", "📡", "🔧", "🧱", "🗄️", "☁️"] },
];

/** Primeiro "caractere visível" (um emoji pode ter vários códigos). */
export function firstGrapheme(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const segmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
  const first = segmenter.segment(trimmed)[Symbol.iterator]().next().value?.segment ?? null;
  return first && first.length <= 16 ? first : null;
}
