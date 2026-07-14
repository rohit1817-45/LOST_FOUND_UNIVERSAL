-- =====================================================================
-- ULFN Storage Buckets — run AFTER 00_schema.sql
-- =====================================================================
-- Buckets:
--   report-images   — public read (report photos)
--   profile-images  — public read (avatars)
--   ngo-documents   — private (verification docs)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('report-images',  'report-images',  true,  10485760, array['image/jpeg','image/png','image/webp']),
    ('profile-images', 'profile-images', true,  5242880,  array['image/jpeg','image/png','image/webp']),
    ('ngo-documents',  'ngo-documents',  false, 20971520, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Storage RLS policies

-- Public read for public buckets
drop policy if exists "Public read report images" on storage.objects;
create policy "Public read report images" on storage.objects for select
    using (bucket_id in ('report-images','profile-images'));

-- Authenticated uploads to their own folder in report-images / profile-images
drop policy if exists "Authenticated upload report images" on storage.objects;
create policy "Authenticated upload report images" on storage.objects for insert
    with check (
        auth.role() = 'authenticated'
        and bucket_id in ('report-images','profile-images','ngo-documents')
    );

-- Owner-only for ngo-documents (private)
drop policy if exists "Owner read ngo docs" on storage.objects;
create policy "Owner read ngo docs" on storage.objects for select
    using (bucket_id = 'ngo-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid())));

-- Owner delete
drop policy if exists "Owner delete own objects" on storage.objects;
create policy "Owner delete own objects" on storage.objects for delete
    using (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid()));
