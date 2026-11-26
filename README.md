# Excalibur

Um quadro branco no estilo do [Excalidraw](https://excalidraw.com), com a organização do Notion: em vez de um único quadro infinito, você cria vários quadros e organiza tudo em pastas e subpastas, cada um salvo na sua conta.

## Funcionalidades

- Editor de desenho completo (o mesmo do Excalidraw), em português
- Login com Google
- Quadros salvos automaticamente na nuvem
- Pastas e subpastas na barra lateral
- Cada conta só enxerga os próprios quadros (Row Level Security no banco)

## Tecnologias

- [Next.js](https://nextjs.org) + React
- [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw)
- [Supabase](https://supabase.com) (Postgres, autenticação e armazenamento)
- Tailwind CSS

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um projeto no Supabase e rode o script [`supabase/migrations/0001_folders_and_boards.sql`](supabase/migrations/0001_folders_and_boards.sql) no **SQL Editor**.
3. Ative o login com Google em **Authentication → Sign In / Providers → Google** e adicione `http://localhost:3000/auth/callback` em **Authentication → URL Configuration → Redirect URLs**.
4. Copie `.env.example` para `.env.local` e preencha com a URL e a Publishable key do projeto.
5. Inicie o servidor:
   ```bash
   npm run dev
   ```
6. Abra [http://localhost:3000](http://localhost:3000).
