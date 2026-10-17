-- Business logic. Every write to the database happens in one of these functions.
--
-- Conventions:
--   * SECURITY DEFINER with an empty search_path; every object is schema-qualified.
--   * The caller is always taken from auth.uid(), never from a parameter.
--   * Errors are raised as 'CS:<CODE>' so the app can show a safe, translated message.
--   * EXECUTE is revoked from everyone at the bottom and granted back explicitly.

CREATE OR REPLACE FUNCTION public.current_approved_uid()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'CS:NOT_AUTHENTICATED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_uid AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'CS:NOT_APPROVED';
  END IF;

  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_admin_uid()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_uid AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  RETURN v_uid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------

-- Internal (not callable by clients). A unit counts as taken from the loan's
-- start date until it is actually confirmed as returned, so an overdue loan
-- keeps blocking the item instead of silently freeing it on its end date.
CREATE OR REPLACE FUNCTION public.item_available(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total INT;
  v_max_booked INT;
  v_today DATE := public.today();
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1
     OR p_start_date IS NULL OR p_end_date IS NULL
     OR p_start_date > p_end_date
     OR p_end_date - p_start_date > 90 THEN
    RETURN FALSE;
  END IF;

  SELECT total_quantity INTO v_total
  FROM public.items
  WHERE id = p_item_id AND approval_status = 'approved';

  IF v_total IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(MAX(daily.booked), 0) INTO v_max_booked
  FROM (
    SELECT (
      SELECT COALESCE(SUM(br.requested_quantity), 0)
      FROM public.borrow_requests br
      JOIN public.loans l ON l.borrow_request_id = br.id
      WHERE br.item_id = p_item_id
        AND br.status = 'approved'
        AND l.status <> 'completed'
        AND d.day::date BETWEEN br.start_date AND GREATEST(br.end_date, v_today)
    ) AS booked
    FROM generate_series(p_start_date::timestamp, p_end_date::timestamp, interval '1 day') AS d(day)
  ) daily;

  RETURN (v_total - v_max_booked) >= p_quantity;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_item_availability(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.current_approved_uid();
  RETURN public.item_available(p_item_id, p_start_date, p_end_date, p_quantity);
END;
$$;

-- Occupancy calendar: dates and quantities only, never who borrowed.
CREATE OR REPLACE FUNCTION public.get_item_bookings(p_item_id UUID)
RETURNS TABLE (start_date DATE, end_date DATE, requested_quantity INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT br.start_date,
         GREATEST(br.end_date, public.today()) AS end_date,
         br.requested_quantity
  FROM public.borrow_requests br
  JOIN public.loans l ON l.borrow_request_id = br.id
  JOIN public.items i ON i.id = br.item_id
  WHERE br.item_id = p_item_id
    AND br.status = 'approved'
    AND l.status <> 'completed'
    AND public.is_approved_user()
    AND (i.approval_status = 'approved' OR i.owner_id = auth.uid() OR public.is_admin());
$$;

-- Catalog "available between dates" filter.
CREATE OR REPLACE FUNCTION public.filter_available_items(
  p_item_ids UUID[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.current_approved_uid();

  IF COALESCE(array_length(p_item_ids, 1), 0) > 200 THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  RETURN QUERY
  SELECT ids.id
  FROM unnest(p_item_ids) AS ids(id)
  WHERE public.item_available(ids.id, p_start_date, p_end_date, 1);
END;
$$;

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_my_profile(p_full_name TEXT, p_residence_area TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_name TEXT := btrim(COALESCE(p_full_name, ''));
BEGIN
  IF char_length(v_name) NOT BETWEEN 2 AND 100
     OR p_residence_area IS NULL
     OR NOT public.is_valid_area(p_residence_area) THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  -- Only these two columns: role, status and email can never be self-edited.
  UPDATE public.users
  SET full_name = v_name,
      residence_area = p_residence_area
  WHERE id = v_uid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_item(
  p_name TEXT,
  p_description TEXT,
  p_category_id UUID,
  p_condition_rating INT,
  p_total_quantity INT,
  p_deposit_amount NUMERIC,
  p_area TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_id UUID;
BEGIN
  IF (SELECT count(*) FROM public.items WHERE owner_id = v_uid) >= 100
     OR (SELECT count(*) FROM public.items
         WHERE owner_id = v_uid AND approval_status = 'pending') >= 20 THEN
    RAISE EXCEPTION 'CS:TOO_MANY_ITEMS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  INSERT INTO public.items (
    owner_id, name, description, category_id, condition_rating,
    total_quantity, available_quantity, deposit_amount, area, approval_status
  )
  VALUES (
    v_uid,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_category_id,
    p_condition_rating,
    p_total_quantity,
    p_total_quantity,
    p_deposit_amount,
    p_area,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_item(
  p_item_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_category_id UUID,
  p_condition_rating INT,
  p_total_quantity INT,
  p_deposit_amount NUMERIC,
  p_area TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_item public.items%ROWTYPE;
  v_name TEXT := btrim(p_name);
  v_description TEXT := NULLIF(btrim(COALESCE(p_description, '')), '');
  v_on_loan INT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_item
  FROM public.items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_item.owner_id <> v_uid THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  v_on_loan := v_item.total_quantity - v_item.available_quantity;
  IF p_total_quantity < v_on_loan THEN
    RAISE EXCEPTION 'CS:QUANTITY_BELOW_LOANED';
  END IF;

  -- What members see in the catalog was approved by an admin. Changing that
  -- text sends the item back to review; so does resubmitting a rejected item.
  v_status := v_item.approval_status;
  IF v_status = 'rejected'
     OR v_name IS DISTINCT FROM v_item.name
     OR v_description IS DISTINCT FROM v_item.description
     OR p_category_id IS DISTINCT FROM v_item.category_id THEN
    v_status := 'pending';
  END IF;

  UPDATE public.items
  SET name = v_name,
      description = v_description,
      category_id = p_category_id,
      condition_rating = p_condition_rating,
      total_quantity = p_total_quantity,
      available_quantity = p_total_quantity - v_on_loan,
      deposit_amount = p_deposit_amount,
      area = p_area,
      approval_status = v_status
  WHERE id = p_item_id;
END;
$$;

-- Returns the storage paths that the caller should now remove from the bucket.
CREATE OR REPLACE FUNCTION public.delete_item(p_item_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_owner UUID;
  v_paths TEXT[];
BEGIN
  SELECT owner_id INTO v_owner
  FROM public.items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.borrow_requests br
    JOIN public.loans l ON l.borrow_request_id = br.id
    WHERE br.item_id = p_item_id AND l.status <> 'completed'
  ) THEN
    RAISE EXCEPTION 'CS:ITEM_ON_LOAN';
  END IF;

  SELECT COALESCE(array_agg(storage_path), ARRAY[]::TEXT[]) INTO v_paths
  FROM public.item_images
  WHERE item_id = p_item_id;

  DELETE FROM public.items WHERE id = p_item_id;

  RETURN v_paths;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_item_image(p_item_id UUID, p_storage_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_item public.items%ROWTYPE;
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

  IF (SELECT count(*) FROM public.item_images WHERE item_id = p_item_id) >= 5 THEN
    RAISE EXCEPTION 'CS:TOO_MANY_IMAGES';
  END IF;

  INSERT INTO public.item_images (item_id, storage_path)
  VALUES (p_item_id, p_storage_path)
  RETURNING id INTO v_id;

  -- A new picture on a published item needs a fresh admin look.
  IF v_item.approval_status <> 'pending' THEN
    UPDATE public.items SET approval_status = 'pending' WHERE id = p_item_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Returns the storage path that the caller should now remove from the bucket.
CREATE OR REPLACE FUNCTION public.remove_item_image(p_image_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_path TEXT;
BEGIN
  SELECT img.storage_path INTO v_path
  FROM public.item_images img
  JOIN public.items i ON i.id = img.item_id
  WHERE img.id = p_image_id AND i.owner_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  DELETE FROM public.item_images WHERE id = p_image_id;
  RETURN v_path;
END;
$$;

-- ---------------------------------------------------------------------------
-- Borrow requests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_borrow_request(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_today DATE := public.today();
  v_item public.items%ROWTYPE;
  v_id UUID;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_quantity IS NULL
     OR p_quantity < 1
     OR p_start_date < v_today
     OR p_start_date > v_today + 365
     OR p_end_date < p_start_date
     OR p_end_date - p_start_date > 90 THEN
    RAISE EXCEPTION 'CS:INVALID_DATES';
  END IF;

  SELECT * INTO v_item
  FROM public.items
  WHERE id = p_item_id AND approval_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  IF v_item.owner_id = v_uid THEN
    RAISE EXCEPTION 'CS:OWN_ITEM';
  END IF;

  IF (SELECT count(*) FROM public.borrow_requests
      WHERE requester_id = v_uid AND status = 'pending') >= 20 THEN
    RAISE EXCEPTION 'CS:TOO_MANY_REQUESTS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.borrow_requests
    WHERE requester_id = v_uid
      AND item_id = p_item_id
      AND status = 'pending'
      AND start_date <= p_end_date
      AND end_date >= p_start_date
  ) THEN
    RAISE EXCEPTION 'CS:DUPLICATE_REQUEST';
  END IF;

  IF NOT public.item_available(p_item_id, p_start_date, p_end_date, p_quantity) THEN
    RAISE EXCEPTION 'CS:NOT_AVAILABLE';
  END IF;

  INSERT INTO public.borrow_requests (
    item_id, requester_id, start_date, end_date, requested_quantity, status
  )
  VALUES (p_item_id, v_uid, p_start_date, p_end_date, p_quantity, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_borrow_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
BEGIN
  UPDATE public.borrow_requests
  SET status = 'cancelled'
  WHERE id = p_request_id
    AND requester_id = v_uid
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_PENDING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_borrow_request(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_request public.borrow_requests%ROWTYPE;
  v_owner UUID;
  v_loan_id UUID;
BEGIN
  SELECT * INTO v_request
  FROM public.borrow_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  -- Locking the item row serialises concurrent approvals for the same item,
  -- so two owners' clicks can never both pass the availability check.
  SELECT owner_id INTO v_owner
  FROM public.items
  WHERE id = v_request.item_id
  FOR UPDATE;

  IF v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'CS:NOT_PENDING';
  END IF;

  IF v_request.end_date < public.today() THEN
    RAISE EXCEPTION 'CS:INVALID_DATES';
  END IF;

  IF NOT public.item_available(
    v_request.item_id,
    v_request.start_date,
    v_request.end_date,
    v_request.requested_quantity
  ) THEN
    RAISE EXCEPTION 'CS:NOT_AVAILABLE';
  END IF;

  UPDATE public.borrow_requests
  SET status = 'approved'
  WHERE id = p_request_id;

  UPDATE public.items
  SET available_quantity = GREATEST(0, available_quantity - v_request.requested_quantity)
  WHERE id = v_request.item_id;

  INSERT INTO public.loans (borrow_request_id, status)
  VALUES (p_request_id, 'active')
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_borrow_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_item_id UUID;
BEGIN
  SELECT item_id INTO v_item_id
  FROM public.borrow_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_PENDING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.items WHERE id = v_item_id AND owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  UPDATE public.borrow_requests
  SET status = 'rejected'
  WHERE id = p_request_id;
END;
$$;

-- The e-mail of the other party, so the two sides can arrange the hand-over.
-- An owner sees the requester's address for pending and approved requests;
-- a requester sees the owner's address only once the request was approved.
CREATE OR REPLACE FUNCTION public.get_request_contacts(p_request_ids UUID[])
RETURNS TABLE (request_id UUID, contact_email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT br.id,
         CASE
           WHEN i.owner_id = auth.uid() AND br.status IN ('pending', 'approved') THEN ru.email
           WHEN br.requester_id = auth.uid() AND br.status = 'approved' THEN ou.email
         END
  FROM public.borrow_requests br
  JOIN public.items i ON i.id = br.item_id
  JOIN public.users ru ON ru.id = br.requester_id
  JOIN public.users ou ON ou.id = i.owner_id
  WHERE br.id = ANY (p_request_ids[1:200])
    AND public.is_approved_user()
    AND (i.owner_id = auth.uid() OR br.requester_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Loans
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_loan_returned(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_requester_id UUID;
BEGIN
  SELECT br.requester_id INTO v_requester_id
  FROM public.loans l
  JOIN public.borrow_requests br ON br.id = l.borrow_request_id
  WHERE l.id = p_loan_id AND l.status IN ('active', 'late')
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:LOAN_STATE';
  END IF;

  IF v_requester_id <> v_uid THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  UPDATE public.loans
  SET status = 'returned_pending_confirmation',
      actual_return_date = public.today()
  WHERE id = p_loan_id;
END;
$$;

-- The owner is the one who knows the item is back, so they can close the loan
-- whether or not the borrower marked it as returned first.
CREATE OR REPLACE FUNCTION public.confirm_loan_return(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_item_id UUID;
  v_quantity INT;
  v_owner UUID;
BEGIN
  SELECT br.item_id, br.requested_quantity INTO v_item_id, v_quantity
  FROM public.loans l
  JOIN public.borrow_requests br ON br.id = l.borrow_request_id
  WHERE l.id = p_loan_id AND l.status <> 'completed'
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:LOAN_STATE';
  END IF;

  SELECT owner_id INTO v_owner
  FROM public.items
  WHERE id = v_item_id
  FOR UPDATE;

  IF v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  UPDATE public.loans
  SET status = 'completed',
      actual_return_date = COALESCE(actual_return_date, public.today())
  WHERE id = p_loan_id;

  UPDATE public.items
  SET available_quantity = LEAST(total_quantity, available_quantity + v_quantity)
  WHERE id = v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_deposit_received(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
BEGIN
  UPDATE public.loans l
  SET deposit_received = TRUE
  FROM public.borrow_requests br
  JOIN public.items i ON i.id = br.item_id
  WHERE l.id = p_loan_id
    AND br.id = l.borrow_request_id
    AND i.owner_id = v_uid
    AND l.status <> 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;
END;
$$;

-- Idempotent and derived purely from dates, so any approved member may trigger
-- it; the app calls it before showing loan lists.
CREATE OR REPLACE FUNCTION public.mark_late_loans()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  PERFORM public.current_approved_uid();

  UPDATE public.loans l
  SET status = 'late'
  FROM public.borrow_requests br
  WHERE l.borrow_request_id = br.id
    AND l.status = 'active'
    AND br.end_date < public.today();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id UUID, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_target public.users%ROWTYPE;
  v_new_status TEXT;
BEGIN
  IF p_user_id = v_admin THEN
    RAISE EXCEPTION 'CS:CANNOT_MODIFY_SELF';
  END IF;

  SELECT * INTO v_target
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  IF v_target.role = 'admin' THEN
    RAISE EXCEPTION 'CS:CANNOT_MODIFY_ADMIN';
  END IF;

  IF p_action = 'approve' AND v_target.status = 'pending' THEN
    v_new_status := 'approved';
  ELSIF p_action = 'block' AND v_target.status <> 'blocked' THEN
    v_new_status := 'blocked';
  ELSIF p_action = 'unblock' AND v_target.status = 'blocked' THEN
    v_new_status := 'approved';
  ELSE
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  UPDATE public.users SET status = v_new_status WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'user_' || p_action, 'user', p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_item_approval(p_item_id UUID, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_new_status TEXT;
BEGIN
  IF p_action = 'approve' THEN
    v_new_status := 'approved';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
  ELSE
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  UPDATE public.items SET approval_status = v_new_status WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'item_' || p_action, 'item', p_item_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (service role only)
-- ---------------------------------------------------------------------------

-- Fixed-window counter. Returns TRUE while the caller is within the limit.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hits INT;
  v_cutoff TIMESTAMPTZ := now() - make_interval(secs => p_window_seconds);
BEGIN
  INSERT INTO public.rate_limits AS r (key, window_start, hits)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE
  SET hits = CASE WHEN r.window_start < v_cutoff THEN 1 ELSE r.hits + 1 END,
      window_start = CASE WHEN r.window_start < v_cutoff THEN now() ELSE r.window_start END
  RETURNING r.hits INTO v_hits;

  -- Occasional cleanup so the table cannot grow without bound.
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits <= p_max;
END;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: nothing is callable unless listed here.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Needed by RLS policies, which are evaluated as the querying user.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_item_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_request_on_item(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_item_availability(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_item_bookings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.filter_available_items(UUID[], DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item(TEXT, TEXT, UUID, INT, INT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item(UUID, TEXT, TEXT, UUID, INT, INT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_item_image(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_item_image(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_borrow_request(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_borrow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_borrow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_borrow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_contacts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_loan_returned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_loan_return(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_deposit_received(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_late_loans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_item_approval(UUID, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
