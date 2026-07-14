-- Schema: users, categories, items, item_images, borrow_requests, loans

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  residence_area TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'regular' CHECK (role IN ('regular', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  condition_rating INT NOT NULL CHECK (condition_rating BETWEEN 1 AND 10),
  total_quantity INT NOT NULL CHECK (total_quantity >= 1),
  available_quantity INT NOT NULL CHECK (available_quantity >= 0),
  deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  area TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (available_quantity <= total_quantity)
);

CREATE TABLE public.item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requested_quantity INT NOT NULL CHECK (requested_quantity >= 1),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
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
CREATE INDEX idx_loans_borrow_request_id ON public.loans(borrow_request_id);

INSERT INTO public.categories (name) VALUES
  ('כלי עבודה'),
  ('ציוד אירוח'),
  ('משחקי קופסה'),
  ('ספרים'),
  ('מזוודות'),
  ('ציוד לאירועים');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, residence_area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'משתמש חדש'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'residence_area', 'מרכז')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
