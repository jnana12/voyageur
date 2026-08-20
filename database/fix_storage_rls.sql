-- ========================================================
-- STORAGE RLS FIX: Enable Public Read for Avatars
-- ========================================================

-- Ensure the 'avatars' bucket exists (idempotent setup)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 1. Allow Public Access to View Avatars
-- Drop old policy if exists
drop policy if exists "Avatar images are publicly accessible" on storage.objects;

-- Create inclusive policy for everyone (authenticated or not) to READ avatar images
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );


-- 2. Allow Authenticated Users to Upload Avatars
-- Drop old policy if exists
drop policy if exists "Users can upload avatars" on storage.objects;

-- Create upload policy restricted to own folder
create policy "Users can upload avatars"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow Authenticated Users to Update/Delete Own Avatars
drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects for update
to authenticated
using (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
