# Excalibur

Seu caderno de ideias, à mão livre. Um quadro branco no estilo do [Excalidraw](https://excalidraw.com), com a organização do Notion: em vez de um único quadro infinito, você cria vários quadros e organiza tudo em pastas e subpastas, cada um salvo na sua conta.

## Funcionalidades

- Editor de desenho completo (baseado no Excalidraw), em português
- Login com Google
- Quadros salvos automaticamente na nuvem, com imagens guardadas no Storage
- Pastas e subpastas na barra lateral: criar, renomear, mover, arrastar para reordenar
- Busca rápida (⌘P), duplicar quadros, favoritos e recentes
- Tela inicial com miniaturas dos quadros
- Ícones (emoji) e cores para pastas e quadros
- Três estilos visuais: **Caderno** (padrão), **Estúdio** e **Organizado**, escolhidos no primeiro acesso e salvos na conta
- Seis modelos prontos (mapa mental, fluxograma, kanban, wireframe, linha do tempo, retrospectiva) e uma biblioteca de elementos
- Página inicial interativa: o visitante rabisca sem cadastro e o desenho vira o primeiro quadro da conta ao entrar
- Cada conta só enxerga os próprios quadros (Row Level Security no banco)

## Endereços

| Rota | O que é |
| --- | --- |
| `/` | Página inicial pública, com um quadro para rabiscar |
| `/login` | Entrar com Google |
| `/app` | Seus quadros (exige login) |
| `/auth/callback` | Retorno do login do Google |

## Tecnologias

- [Next.js](https://nextjs.org) 16 + React 19
- [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw)
- [Supabase](https://supabase.com) (Postgres, autenticação e Storage)
- Tailwind CSS 4

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um projeto no Supabase e rode, **em ordem**, os scripts de [`supabase/migrations/`](supabase/migrations) no **SQL Editor**:
   | Script | O que cria |
   | --- | --- |
   | [`0001_folders_and_boards.sql`](supabase/migrations/0001_folders_and_boards.sql) | Tabelas de pastas e quadros, com as regras de acesso |
   | [`0002_board_files_storage.sql`](supabase/migrations/0002_board_files_storage.sql) | Bucket `board-files` para as imagens dos quadros |
   | [`0003_icons_and_colors.sql`](supabase/migrations/0003_icons_and_colors.sql) | Ícones e cores em pastas e quadros |
   | [`0004_home_thumbnails_favorites.sql`](supabase/migrations/0004_home_thumbnails_favorites.sql) | Miniaturas, favoritos e "aberto por último" |
3. Ative o login com Google em **Authentication → Sign In / Providers → Google** e adicione `http://localhost:3000/auth/callback` em **Authentication → URL Configuration → Redirect URLs**.
4. Copie `.env.example` para `.env.local` e preencha com a URL e a Publishable key do projeto.
5. Inicie o servidor:
   ```bash
   npm run dev
   ```
6. Abra [http://localhost:3000](http://localhost:3000).

## Publicando na Vercel

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (os mesmos valores do `.env.local`).
3. Depois do primeiro deploy, no Supabase, em **Authentication → URL Configuration**:
   - troque o **Site URL** pelo endereço da Vercel (ex.: `https://seu-projeto.vercel.app`);
   - adicione `https://seu-projeto.vercel.app/auth/callback` em **Redirect URLs** (mantenha o de `localhost` para continuar testando no computador).
