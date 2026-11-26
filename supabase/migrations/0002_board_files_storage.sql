-- Excalibur: imagens dos quadros no Supabase Storage
-- Cole tudo no Supabase > SQL Editor e clique em "Run".
--
-- Cada imagem fica em board-files/<id do usuário>/<id da imagem>.
-- O id da imagem é um hash do conteúdo (gerado pelo Excalidraw), então a mesma
-- imagem usada em vários quadros é guardada uma vez só.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-files', 'board-files', false, 20971520, array['image/*']) -- até 20 MB por imagem
on conflict (id) do nothing;

-- Cada pessoa só lê, envia e apaga arquivos dentro da própria pasta (o id dela)
create policy "board-files: ler os próprios" on storage.objects
  for select to authenticated
  using (bucket_id = 'board-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "board-files: enviar os próprios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'board-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "board-files: apagar os próprios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'board-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
