-- My Excalidraw: pastas e quadros
-- Cole tudo no Supabase > SQL Editor e clique em "Run".

-- =========================================================
-- Tabelas
-- =========================================================

create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id   uuid references public.folders (id) on delete cascade, -- null = pasta na raiz
  name        text not null default 'Nova pasta' check (char_length(name) between 1 and 200),
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id   uuid references public.folders (id) on delete cascade, -- null = quadro solto na raiz
  name        text not null default 'Sem título' check (char_length(name) between 1 and 200),
  position    double precision not null default 0,
  elements    jsonb not null default '[]'::jsonb,  -- formas, setas, textos (formato do Excalidraw)
  app_state   jsonb not null default '{}'::jsonb,  -- cor de fundo etc.
  files       jsonb not null default '{}'::jsonb,  -- imagens coladas no quadro
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index folders_user_id_idx  on public.folders (user_id);
create index folders_parent_id_idx on public.folders (parent_id);
create index boards_user_id_idx   on public.boards (user_id);
create index boards_folder_id_idx on public.boards (folder_id);

-- Atualiza updated_at automaticamente
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger folders_set_updated_at before update on public.folders
  for each row execute function public.set_updated_at();
create trigger boards_set_updated_at before update on public.boards
  for each row execute function public.set_updated_at();

-- =========================================================
-- Segurança (Row Level Security): cada pessoa só vê e mexe no que é dela
-- =========================================================

alter table public.folders enable row level security;
alter table public.boards  enable row level security;

-- Uma pasta-mãe / pasta de destino precisa ser do mesmo usuário
create function public.owns_folder(folder uuid) returns boolean
language sql stable security invoker as $$
  select folder is null
      or exists (select 1 from public.folders f where f.id = folder and f.user_id = (select auth.uid()));
$$;

create policy "folders: ver as próprias" on public.folders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "folders: criar as próprias" on public.folders
  for insert to authenticated with check (user_id = (select auth.uid()) and public.owns_folder(parent_id));
create policy "folders: editar as próprias" on public.folders
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_folder(parent_id));
create policy "folders: apagar as próprias" on public.folders
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "boards: ver os próprios" on public.boards
  for select to authenticated using (user_id = (select auth.uid()));
create policy "boards: criar os próprios" on public.boards
  for insert to authenticated with check (user_id = (select auth.uid()) and public.owns_folder(folder_id));
create policy "boards: editar os próprios" on public.boards
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_folder(folder_id));
create policy "boards: apagar os próprios" on public.boards
  for delete to authenticated using (user_id = (select auth.uid()));

-- =========================================================
-- Acesso pela API (Data API) para usuários logados.
-- Projetos novos do Supabase podem não liberar tabelas novas automaticamente.
-- =========================================================

grant select, insert, update, delete on public.folders, public.boards to authenticated;
notify pgrst, 'reload schema';
