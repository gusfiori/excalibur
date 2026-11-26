-- Excalibur: tela inicial (miniaturas, favoritos e recentes)
-- Cole tudo no Supabase > SQL Editor e clique em "Run".

alter table public.boards
  add column thumbnail text,                         -- prévia pequena do desenho (imagem em data URL)
  add column favorite  boolean not null default false,
  add column opened_at timestamptz;                  -- última vez que o quadro foi aberto (para "Recentes")

create index boards_opened_at_idx on public.boards (user_id, opened_at desc nulls last);

-- "Editado há X" deve mudar só quando o desenho ou o nome mudam:
-- abrir, favoritar, mover, reordenar ou gerar a miniatura não contam como edição.
create or replace function public.set_board_updated_at() returns trigger
language plpgsql as $$
begin
  if (new.elements, new.app_state, new.files, new.name)
     is distinct from (old.elements, old.app_state, old.files, old.name) then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger boards_set_updated_at on public.boards;
create trigger boards_set_updated_at before update on public.boards
  for each row execute function public.set_board_updated_at();

notify pgrst, 'reload schema';
