import type { ColorKey } from "@/lib/appearance";
import type { ThemeId } from "@/lib/themes";

export type Folder = {
  id: string;
  name: string;
  /** null = pasta na raiz */
  parentId: string | null;
  position: number;
  /** Emoji escolhido (null = ícone padrão de pasta) */
  icon: string | null;
  color: ColorKey | null;
};

/** Ícone e cor de uma pasta ou quadro. */
export type ItemAppearance = { icon: string | null; color: ColorKey | null };

export type UserInfo = {
  id: string;
  /** null = ainda não escolheu (primeiro acesso) */
  theme: ThemeId | null;
  name: string;
  email: string;
  avatarUrl: string | null;
};

/** Dados de um quadro que aparecem na sidebar (sem o desenho). */
export type Board = {
  id: string;
  name: string;
  /** null = quadro solto na raiz */
  folderId: string | null;
  position: number;
  /** Emoji escolhido (null = ícone padrão de quadro) */
  icon: string | null;
  color: ColorKey | null;
};
