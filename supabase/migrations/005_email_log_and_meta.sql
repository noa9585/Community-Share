-- Category icons, image ordering, the e-mail log and the daily-job function.
-- Additive only: nothing existing is dropped or rewritten.

-- Category icon: the name of a Material Symbols glyph.
ALTER TABLE public.categories
  ADD COLUMN icon TEXT NOT NULL DEFAULT 'category'
  CHECK (icon ~ '^[a-z0-9_]{1,40}$');

UPDATE public.categories SET icon = 'handyman' WHERE name = 'כלי עבודה';
UPDATE public.categories SET icon = 'flatware' WHERE name = 'ציוד אירוח';
UPDATE public.categories SET icon = 'sports_esports' WHERE name = 'משחקי קופסה';
UPDATE public.categories SET icon = 'menu_book' WHERE name = 'ספרים';
UPDATE public.categories SET icon = 'luggage' WHERE name = 'מזוודות';
UPDATE public.categories SET icon = 'celebration' WHERE name = 'ציוד לאירועים';

-- Explicit picture order (the first one is the item's cover).
ALTER TABLE public.item_images
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0
  CHECK (sort_order BETWEEN 0 AND 100);

CREATE OR REPLACE FUNCTION public.add_item_image(p_item_id UUID, p_storage_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_item public.items%ROWTYPE;
  v_count INT;
  v_next INT;
  v_id UUID;
BEGIN
  SELECT * INTO v_item
  FROM public.items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_item.owner_id <> v_uid THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  -- The path must be inside the caller's own folder for this exact item.
  IF p_storage_path !~ (
    '^' || v_uid::text || '/' || p_item_id::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  SELECT count(*), COALESCE(MAX(sort_order) + 1, 0) INTO v_count, v_next
  FROM public.item_images
  WHERE item_id = p_item_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'CS:TOO_MANY_IMAGES';
  END IF;

  INSERT INTO public.item_images (item_id, storage_path, sort_order)
  VALUES (p_item_id, p_storage_path, v_next)
  RETURNING id INTO v_id;

  -- A new picture on a published item needs a fresh admin look.
  IF v_item.approval_status <> 'pending' THEN
    UPDATE public.items SET approval_status = 'pending' WHERE id = p_item_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Every notification the system tried to send. Used to avoid sending the same
-- reminder twice and shown to admins as an activity log. It never stores the
-- message body or the recipient's address.
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'request_created',
    'request_approved',
    'request_rejected',
    'user_approved',
    'item_approved',
    'return_reminder',
    'loan_overdue',
    'return_marked'
  )),
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  related_id UUID,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_sent_at ON public.email_log(sent_at DESC);
CREATE INDEX idx_email_log_dedupe ON public.email_log(type, recipient_user_id, related_id)
  WHERE status = 'sent';

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Admins may read the log. Nobody writes through the API: rows are inserted by
-- the server with the service role, which bypasses RLS.
CREATE POLICY email_log_select ON public.email_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON public.email_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.email_log TO authenticated;

-- Daily job: flags loans whose end date has passed and returns their ids.
-- Runs without a signed-in user, so it is executable by the service role only.
CREATE OR REPLACE FUNCTION public.cron_mark_late_loans()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.loans l
  SET status = 'late'
  FROM public.borrow_requests br
  WHERE l.borrow_request_id = br.id
    AND l.status = 'active'
    AND br.end_date < public.today()
  RETURNING l.id;
$$;

REVOKE EXECUTE ON FUNCTION public.add_item_image(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_item_image(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_mark_late_loans() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_mark_late_loans() TO service_role;
