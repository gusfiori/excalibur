-- Excalibur: ícone (emoji) e cor nas pastas e quadros
-- Cole tudo no Supabase > SQL Editor e clique em "Run".

alter table public.folders
  add column icon  text check (char_length(icon) between 1 and 16),
  add column color text check (color in ('gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'));

alter table public.boards
  add column icon  text check (char_length(icon) between 1 and 16),
  add column color text check (color in ('gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'));

notify pgrst, 'reload schema';
