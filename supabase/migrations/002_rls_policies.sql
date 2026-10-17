-- Row Level Security.
--
-- Model: default deny. Clients may only SELECT (filtered by the policies below).
-- Every write goes through a SECURITY DEFINER function in 003_functions.sql,
-- so there are deliberately no INSERT/UPDATE/DELETE policies.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_item_owner(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.items
    WHERE id = p_item_id
      AND owner_id = auth.uid()
  );
$$;

-- Lets a borrower keep seeing an item they have a request on, even if the item
-- later leaves the public catalog (e.g. it went back to admin review).
CREATE OR REPLACE FUNCTION public.has_request_on_item(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.borrow_requests
    WHERE item_id = p_item_id
      AND requester_id = auth.uid()
  );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No policies at all: only the service role (which bypasses RLS) can touch it.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- users: a user reads only their own row; admins read everyone.
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- categories
CREATE POLICY categories_select ON public.categories
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

-- items
CREATE POLICY items_select ON public.items
  FOR SELECT TO authenticated
  USING (
    public.is_approved_user()
    AND (
      approval_status = 'approved'
      OR owner_id = auth.uid()
      OR public.has_request_on_item(id)
      OR public.is_admin()
    )
  );

-- item_images
CREATE POLICY item_images_select ON public.item_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_images.item_id)
  );

-- borrow_requests: only the two parties and admins.
CREATE POLICY borrow_requests_select ON public.borrow_requests
  FOR SELECT TO authenticated
  USING (
    public.is_approved_user()
    AND (
      requester_id = auth.uid()
      OR public.is_item_owner(item_id)
      OR public.is_admin()
    )
  );

-- loans: visible exactly when the parent request is visible.
CREATE POLICY loans_select ON public.loans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = loans.borrow_request_id
    )
  );

-- admin_audit_log
CREATE POLICY admin_audit_log_select ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Minimal public profile of approved members (name + area only, never email).
-- The view runs with its owner's rights on purpose, so it can read past the
-- users policy while exposing only these columns to approved members.
CREATE VIEW public.public_profiles
WITH (security_invoker = false, security_barrier = true) AS
  SELECT u.id, u.full_name, u.residence_area
  FROM public.users u
  WHERE u.status = 'approved'
    AND public.is_approved_user();

-- Table privileges: nothing for anonymous visitors, read-only for signed-in users.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT SELECT ON
  public.users,
  public.categories,
  public.items,
  public.item_images,
  public.borrow_requests,
  public.loans,
  public.admin_audit_log,
  public.public_profiles
TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
