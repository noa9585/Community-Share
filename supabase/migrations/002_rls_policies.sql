-- RLS helper functions and policies

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.items
    WHERE id = p_item_id
      AND owner_id = auth.uid()
  );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY users_update_own_profile ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND status = (SELECT status FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY users_admin_update ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- categories
CREATE POLICY categories_select_approved ON public.categories
  FOR SELECT TO authenticated
  USING (public.is_approved_user() OR public.is_admin());

CREATE POLICY categories_admin_all ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- items
CREATE POLICY items_select_catalog ON public.items
  FOR SELECT TO authenticated
  USING (
    (approval_status = 'approved' AND public.is_approved_user())
    OR owner_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY items_insert_own ON public.items
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.is_approved_user()
    AND approval_status = 'pending'
  );

CREATE POLICY items_update_own ON public.items
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.is_approved_user())
  WITH CHECK (
    owner_id = auth.uid()
    AND approval_status = (SELECT approval_status FROM public.items WHERE id = items.id)
  );

CREATE POLICY items_admin_update ON public.items
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY items_delete_own ON public.items
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.is_approved_user());

-- item_images
CREATE POLICY item_images_select ON public.item_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_images.item_id
        AND (
          (i.approval_status = 'approved' AND public.is_approved_user())
          OR i.owner_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY item_images_insert ON public.item_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_images.item_id
        AND i.owner_id = auth.uid()
        AND public.is_approved_user()
    )
  );

CREATE POLICY item_images_delete ON public.item_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_images.item_id
        AND i.owner_id = auth.uid()
    )
  );

-- borrow_requests
CREATE POLICY borrow_requests_select ON public.borrow_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.is_item_owner(item_id)
    OR public.is_admin()
  );

CREATE POLICY borrow_requests_insert ON public.borrow_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND public.is_approved_user()
    AND status = 'pending'
  );

CREATE POLICY borrow_requests_update_owner ON public.borrow_requests
  FOR UPDATE TO authenticated
  USING (public.is_item_owner(item_id) AND public.is_approved_user())
  WITH CHECK (public.is_item_owner(item_id));

CREATE POLICY borrow_requests_update_requester ON public.borrow_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

-- loans
CREATE POLICY loans_select ON public.loans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = loans.borrow_request_id
        AND (
          br.requester_id = auth.uid()
          OR public.is_item_owner(br.item_id)
          OR public.is_admin()
        )
    )
  );

CREATE POLICY loans_insert ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_item_owner(
    (SELECT item_id FROM public.borrow_requests WHERE id = borrow_request_id)
  ));

CREATE POLICY loans_update ON public.loans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = loans.borrow_request_id
        AND (
          br.requester_id = auth.uid()
          OR public.is_item_owner(br.item_id)
          OR public.is_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = loans.borrow_request_id
        AND (
          br.requester_id = auth.uid()
          OR public.is_item_owner(br.item_id)
          OR public.is_admin()
        )
    )
  );
