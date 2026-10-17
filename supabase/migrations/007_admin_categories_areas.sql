-- Lets admins manage the item categories and the list of residence areas.
--
-- Until now the six areas were fixed in code and in CHECK constraints. They
-- move into a table, and users/items point at it with a foreign key on the
-- area's name, so renaming an area updates every member and item at once
-- (ON UPDATE CASCADE) and an area in use cannot be deleted.
-- Nothing existing is deleted; every current value is carried over.

-- ---------------------------------------------------------------------------
-- Areas
-- ---------------------------------------------------------------------------

CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
    CHECK (char_length(name) BETWEEN 2 AND 40 AND name = btrim(name) AND name !~ '[<>]'),
  sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.areas (name, sort_order) VALUES
  ('צפון', 1),
  ('דרום', 2),
  ('מרכז', 3),
  ('ירושלים', 4),
  ('שרון', 5),
  ('שפלה', 6);

-- Any value already stored somewhere is kept as an area of its own.
INSERT INTO public.areas (name, sort_order)
SELECT DISTINCT v.name, 100
FROM (
  SELECT residence_area AS name FROM public.users
  UNION
  SELECT area FROM public.items
) v
WHERE char_length(v.name) BETWEEN 2 AND 40
ON CONFLICT (name) DO NOTHING;

-- Replace the fixed-list CHECK constraints with foreign keys.
DO $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT c.conrelid::regclass AS rel, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'c'
      AND c.conrelid IN ('public.users'::regclass, 'public.items'::regclass)
      AND pg_get_constraintdef(c.oid) ILIKE '%is_valid_area%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_row.rel, v_row.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.users
  ADD CONSTRAINT users_residence_area_fkey
  FOREIGN KEY (residence_area) REFERENCES public.areas(name) ON UPDATE CASCADE;

ALTER TABLE public.items
  ADD CONSTRAINT items_area_fkey
  FOREIGN KEY (area) REFERENCES public.areas(name) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_residence_area ON public.users(residence_area);

CREATE OR REPLACE FUNCTION public.is_valid_area(p_area TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.areas WHERE name = p_area);
$$;

-- Sign-up: an unknown area falls back to the first area in the list, not to a
-- hard-coded name that an admin might have renamed or deleted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := left(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), 100);
  v_area TEXT := NEW.raw_user_meta_data->>'residence_area';
BEGIN
  IF char_length(v_name) < 2 THEN
    v_name := 'משתמש חדש';
  END IF;

  IF v_area IS NULL OR NOT public.is_valid_area(v_area) THEN
    SELECT name INTO v_area FROM public.areas ORDER BY sort_order, name LIMIT 1;
  END IF;

  INSERT INTO public.users (id, full_name, email, residence_area, role, status)
  VALUES (NEW.id, v_name, left(COALESCE(NEW.email, ''), 320), v_area, 'regular', 'pending');
  RETURN NEW;
END;
$$;

-- The area list is not sensitive and the sign-up form needs it before the
-- visitor has an account, so everyone may read it. Nobody may write it
-- except through the admin functions below.
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY areas_select ON public.areas
  FOR SELECT TO anon, authenticated
  USING (TRUE);

REVOKE ALL ON public.areas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.areas TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: areas
-- ---------------------------------------------------------------------------

-- Creates an area (p_id NULL) or renames one. A rename reaches every member
-- and item that uses the area through the foreign keys.
CREATE OR REPLACE FUNCTION public.admin_save_area(p_id UUID, p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_id UUID;
BEGIN
  IF char_length(v_name) NOT BETWEEN 2 AND 40 OR v_name ~ '[<>]' THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.areas WHERE name = v_name AND id IS DISTINCT FROM p_id
  ) THEN
    RAISE EXCEPTION 'CS:DUPLICATE_NAME';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.areas (name, sort_order)
    VALUES (v_name, COALESCE((SELECT MAX(sort_order) + 1 FROM public.areas), 1))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.areas SET name = v_name WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'CS:NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, CASE WHEN p_id IS NULL THEN 'area_create' ELSE 'area_update' END, 'area', v_id);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_area(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_name TEXT;
BEGIN
  SELECT name INTO v_name FROM public.areas WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE residence_area = v_name)
     OR EXISTS (SELECT 1 FROM public.items WHERE area = v_name) THEN
    RAISE EXCEPTION 'CS:AREA_IN_USE';
  END IF;

  IF (SELECT count(*) FROM public.areas) <= 1 THEN
    RAISE EXCEPTION 'CS:LAST_AREA';
  END IF;

  DELETE FROM public.areas WHERE id = p_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'area_delete', 'area', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin: categories
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_save_category(p_id UUID, p_name TEXT, p_icon TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_icon TEXT := COALESCE(NULLIF(btrim(p_icon), ''), 'category');
  v_id UUID;
BEGIN
  IF char_length(v_name) NOT BETWEEN 2 AND 60 OR v_name ~ '[<>]'
     OR v_icon !~ '^[a-z0-9_]{1,40}$' THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.categories WHERE name = v_name AND id IS DISTINCT FROM p_id
  ) THEN
    RAISE EXCEPTION 'CS:DUPLICATE_NAME';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.categories (name, icon) VALUES (v_name, v_icon) RETURNING id INTO v_id;
  ELSE
    UPDATE public.categories SET name = v_name, icon = v_icon WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'CS:NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, CASE WHEN p_id IS NULL THEN 'category_create' ELSE 'category_update' END, 'category', v_id);

  RETURN v_id;
END;
$$;

-- A category with items cannot be deleted: the items would silently lose it.
-- Renaming it, or moving the items first, is the way to retire one.
CREATE OR REPLACE FUNCTION public.admin_delete_category(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_id) THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.items WHERE category_id = p_id) THEN
    RAISE EXCEPTION 'CS:CATEGORY_IN_USE';
  END IF;

  IF (SELECT count(*) FROM public.categories) <= 1 THEN
    RAISE EXCEPTION 'CS:LAST_CATEGORY';
  END IF;

  DELETE FROM public.categories WHERE id = p_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'category_delete', 'category', p_id);
END;
$$;

-- How much each category and area is used, for the admin settings screen.
CREATE OR REPLACE FUNCTION public.admin_taxonomy_usage()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.current_admin_uid();

  RETURN jsonb_build_object(
    'categories', (
      SELECT COALESCE(jsonb_object_agg(c.id, (
        SELECT count(*) FROM public.items i WHERE i.category_id = c.id
      )), '{}'::jsonb)
      FROM public.categories c
    ),
    'areas', (
      SELECT COALESCE(jsonb_object_agg(a.id, jsonb_build_object(
        'users', (SELECT count(*) FROM public.users u WHERE u.residence_area = a.name),
        'items', (SELECT count(*) FROM public.items i WHERE i.area = a.name)
      )), '{}'::jsonb)
      FROM public.areas a
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.admin_save_area(UUID, TEXT),
  public.admin_delete_area(UUID),
  public.admin_save_category(UUID, TEXT, TEXT),
  public.admin_delete_category(UUID),
  public.admin_taxonomy_usage()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_save_area(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_area(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_category(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_taxonomy_usage() TO authenticated;
