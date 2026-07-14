-- Business logic functions: availability, approve, late marking

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
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_max_booked INT;
BEGIN
  IF p_quantity < 1 OR p_start_date > p_end_date THEN
    RETURN FALSE;
  END IF;

  SELECT total_quantity INTO v_total
  FROM public.items
  WHERE id = p_item_id AND approval_status = 'approved';

  IF v_total IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(MAX(booked), 0) INTO v_max_booked
  FROM (
    SELECT d::date AS day,
      (
        SELECT COALESCE(SUM(br.requested_quantity), 0)
        FROM public.borrow_requests br
        JOIN public.loans l ON l.borrow_request_id = br.id
        WHERE br.item_id = p_item_id
          AND br.status = 'approved'
          AND l.status IN ('active', 'returned_pending_confirmation', 'late')
          AND d::date BETWEEN br.start_date AND br.end_date
      ) AS booked
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d
  ) daily;

  RETURN (v_total - v_max_booked) >= p_quantity;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_borrow_request(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.borrow_requests%ROWTYPE;
  v_loan_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_request
  FROM public.borrow_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF NOT public.is_item_owner(v_request.item_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  IF NOT public.check_item_availability(
    v_request.item_id,
    v_request.start_date,
    v_request.end_date,
    v_request.requested_quantity
  ) THEN
    RAISE EXCEPTION 'Item not available for requested dates/quantity';
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
SET search_path = public
AS $$
DECLARE
  v_item_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT item_id INTO v_item_id
  FROM public.borrow_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  IF NOT public.is_item_owner(v_item_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.borrow_requests
  SET status = 'rejected'
  WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_loan_returned(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID;
BEGIN
  SELECT br.requester_id INTO v_requester_id
  FROM public.loans l
  JOIN public.borrow_requests br ON br.id = l.borrow_request_id
  WHERE l.id = p_loan_id AND l.status IN ('active', 'late')
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found or not returnable';
  END IF;

  IF v_requester_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.loans
  SET status = 'returned_pending_confirmation',
      actual_return_date = CURRENT_DATE
  WHERE id = p_loan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_loan_return(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id UUID;
  v_quantity INT;
BEGIN
  SELECT br.item_id, br.requested_quantity INTO v_item_id, v_quantity
  FROM public.loans l
  JOIN public.borrow_requests br ON br.id = l.borrow_request_id
  WHERE l.id = p_loan_id AND l.status = 'returned_pending_confirmation'
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not awaiting confirmation';
  END IF;

  IF NOT public.is_item_owner(v_item_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.loans
  SET status = 'completed'
  WHERE id = p_loan_id;

  UPDATE public.items
  SET available_quantity = LEAST(total_quantity, available_quantity + v_quantity)
  WHERE id = v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_late_loans()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.loans l
  SET status = 'late'
  FROM public.borrow_requests br
  WHERE l.borrow_request_id = br.id
    AND l.status = 'active'
    AND br.end_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_item_availability(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_borrow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_borrow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_loan_returned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_loan_return(UUID) TO authenticated;
