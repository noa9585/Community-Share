-- Storage bucket and policies for item images.
--
-- The bucket is private: images are only reachable through short-lived signed
-- URLs that the server creates for approved members. Files are re-encoded and
-- size-capped in the browser, then type-checked by magic bytes on the server.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  FALSE,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY item_images_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'item-images'
    AND public.is_approved_user()
  );

-- Path layout: <owner id>/<item id>/<uuid>.<ext>. A member may only write
-- inside their own folder, and only under an item they own.
CREATE POLICY item_images_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'item-images'
    AND public.is_approved_user()
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_item_owner(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY item_images_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'item-images'
    AND public.is_approved_user()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
