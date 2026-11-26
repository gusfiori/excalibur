import type { ThemeId } from "@/lib/themes";

export type Folder = {
  id: string;
  name: string;
  /** null = pasta na raiz */
  parentId: string | null;
  position: number;
};

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
};
