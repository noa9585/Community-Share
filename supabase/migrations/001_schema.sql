-- Schema: users, categories, items, item_images, borrow_requests, loans,
-- admin_audit_log, rate_limits

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.is_valid_area(p_area TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_area IN ('צפון', 'דרום', 'מרכז', 'ירושלים', 'שרון', 'שפלה');
$$;

-- The community lives in Israel; "today" must not flip at UTC midnight.
CREATE OR REPLACE FUNCTION public.today()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Jerusalem')::date;
$$;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  email TEXT NOT NULL CHECK (char_length(email) <= 320),
  residence_area TEXT NOT NULL CHECK (public.is_valid_area(residence_area)),
  role TEXT NOT NULL DEFAULT 'regular' CHECK (role IN ('regular', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  condition_rating INT NOT NULL CHECK (condition_rating BETWEEN 1 AND 10),
  total_quantity INT NOT NULL CHECK (total_quantity BETWEEN 1 AND 1000),
  available_quantity INT NOT NULL CHECK (available_quantity >= 0),
  deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (deposit_amount >= 0 AND deposit_amount <= 100000),
  area TEXT NOT NULL CHECK (public.is_valid_area(area)),
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (available_quantity <= total_quantity)
);

-- Images live in a private storage bucket; only the object path is stored.
CREATE TABLE public.item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE CHECK (char_length(storage_path) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requested_quantity INT NOT NULL CHECK (requested_quantity BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date),
  CHECK (end_date - start_date <= 90)
);

CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_request_id UUID NOT NULL UNIQUE REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'returned_pending_confirmation', 'completed', 'late')),
  actual_return_date DATE,
  deposit_received BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Server-side rate limiting counters. Keys are SHA-256 hashes, never raw IPs/emails.
CREATE TABLE public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hits INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_items_owner_id ON public.items(owner_id);
CREATE INDEX idx_items_category_id ON public.items(category_id);
CREATE INDEX idx_items_approval_status ON public.items(approval_status);
CREATE INDEX idx_items_area ON public.items(area);
CREATE INDEX idx_item_images_item_id ON public.item_images(item_id);
CREATE INDEX idx_borrow_requests_item_id ON public.borrow_requests(item_id);
CREATE INDEX idx_borrow_requests_requester_id ON public.borrow_requests(requester_id);
CREATE INDEX idx_borrow_requests_status ON public.borrow_requests(status);
CREATE INDEX idx_borrow_requests_dates ON public.borrow_requests(start_date, end_date);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);

INSERT INTO public.categories (name) VALUES
  ('כלי עבודה'),
  ('ציוד אירוח'),
  ('משחקי קופסה'),
  ('ספרים'),
  ('מזוודות'),
  ('ציוד לאירועים');

-- Profile row for every new auth user. Sign-up metadata is attacker-controlled
-- (anyone can call the auth API with the public key), so it is sanitised here
-- and role/status are never taken from it.
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
    v_area := 'מרכז';
  END IF;

  INSERT INTO public.users (id, full_name, email, residence_area, role, status)
  VALUES (NEW.id, v_name, left(COALESCE(NEW.email, ''), 320), v_area, 'regular', 'pending');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
