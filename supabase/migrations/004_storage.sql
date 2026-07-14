-- Storage bucket and policies for item images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY item_images_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'item-images');

CREATE POLICY item_images_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'item-images'
    AND public.is_approved_user()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY item_images_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
