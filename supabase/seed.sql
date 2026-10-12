-- Demo data for presentations: categories, items and loans in every state.
--
-- Run AFTER scripts/create-demo-users.ts, in the Supabase SQL Editor. The two
-- demo accounts are looked up by e-mail; change the addresses below if you
-- created them with different ones. Safe to run once: it refuses to run again
-- if demo items already exist. It only inserts rows and never deletes anything.

DO $$
DECLARE
  v_admin UUID;
  v_user UUID;
  v_today DATE := public.today();
  c_tools UUID; c_hosting UUID; c_games UUID; c_books UUID;
  c_luggage UUID; c_events UUID; c_baby UUID; c_outdoor UUID;
  i_drill UUID; i_ladder UUID; i_suitcase UUID; i_urn UUID;
  i_catan UUID; i_tent UUID; i_chairs UUID; i_stroller UUID;
  r UUID;
BEGIN
  SELECT id INTO v_admin FROM public.users WHERE email = 'demo.admin@example.com';
  SELECT id INTO v_user FROM public.users WHERE email = 'demo.user@example.com';

  IF v_admin IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'Demo users not found. Run scripts/create-demo-users.ts first.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.items WHERE owner_id IN (v_admin, v_user)) THEN
    RAISE EXCEPTION 'Demo items already exist. Nothing was changed.';
  END IF;

  INSERT INTO public.categories (name, icon) VALUES
    ('ציוד לתינוקות', 'child_care'),
    ('ספורט וטיולים', 'hiking')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO c_tools FROM public.categories WHERE name = 'כלי עבודה';
  SELECT id INTO c_hosting FROM public.categories WHERE name = 'ציוד אירוח';
  SELECT id INTO c_games FROM public.categories WHERE name = 'משחקי קופסה';
  SELECT id INTO c_books FROM public.categories WHERE name = 'ספרים';
  SELECT id INTO c_luggage FROM public.categories WHERE name = 'מזוודות';
  SELECT id INTO c_events FROM public.categories WHERE name = 'ציוד לאירועים';
  SELECT id INTO c_baby FROM public.categories WHERE name = 'ציוד לתינוקות';
  SELECT id INTO c_outdoor FROM public.categories WHERE name = 'ספורט וטיולים';

  -- Items owned by the demo admin -------------------------------------------
  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_admin, 'מקדחה רוטטת בוש', 'מקדחה חזקה עם שתי סוללות ומטען. מתאימה לקידוח בבטון ובעץ. מגיעה במזוודה עם סט מקדחים.', c_tools, 8, 1, 1, 100, 'מרכז', 'approved')
  RETURNING id INTO i_drill;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_admin, 'סולם אלומיניום 6 שלבים', 'סולם יציב וקל, מגיע עד תקרה רגילה. נא להחזיר נקי.', c_tools, 9, 1, 1, 0, 'מרכז', 'approved')
  RETURNING id INTO i_ladder;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_admin, 'מיחם שבת 40 כוסות', 'מיחם נירוסטה גדול לאירועים ולשבתות. כולל ברז ומכסה.', c_hosting, 7, 2, 2, 50, 'מרכז', 'approved')
  RETURNING id INTO i_urn;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_admin, 'קטאן – המתיישבים', 'משחק קופסה ל-3–4 שחקנים, כל החלקים קיימים. כולל הרחבה ל-6 שחקנים.', c_games, 10, 1, 1, 0, 'מרכז', 'approved')
  RETURNING id INTO i_catan;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_admin, 'כיסאות מתקפלים', 'כיסאות פלסטיק לבנים מתקפלים, נוחים לאירוח בחצר או בסלון.', c_events, 8, 20, 20, 0, 'מרכז', 'approved')
  RETURNING id INTO i_chairs;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status) VALUES
    (v_admin, 'מפת שולחן לבנה לאירוע', 'מפת בד לבנה גדולה (3 מטר), מכובסת ומגוהצת. מתאימה לשולחן אבירים.', c_events, 9, 4, 4, 30, 'מרכז', 'approved'),
    (v_admin, 'פלטת שבת גדולה', 'פלטה חשמלית לארבעה סירים, עם שעון שבת.', c_hosting, 7, 1, 1, 0, 'מרכז', 'approved'),
    (v_admin, 'מסור עגול חשמלי', 'מסור עגול 1400W עם להב חדש. מומלץ למי שיש ניסיון.', c_tools, 6, 1, 1, 150, 'מרכז', 'approved'),
    (v_admin, 'טיקט טו רייד – אירופה', 'משחק רכבות משפחתי, מתאים מגיל 8.', c_games, 9, 1, 1, 0, 'מרכז', 'approved'),
    (v_admin, 'סדרת הארי פוטר – 7 ספרים', 'כל הסדרה בעברית, כריכה רכה, במצב טוב מאוד.', c_books, 8, 1, 1, 0, 'מרכז', 'approved');

  -- Items owned by the demo member ------------------------------------------
  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_user, 'מזוודה גדולה 28 אינץ''', 'מזוודה קשיחה עם ארבעה גלגלים ומנעול TSA. מתאימה לטיסה ארוכה.', c_luggage, 8, 1, 1, 100, 'שרון', 'approved')
  RETURNING id INTO i_suitcase;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_user, 'אוהל משפחתי ל-6', 'אוהל פתיחה מהירה, עמיד לגשם קל. כולל יתדות ותיק נשיאה.', c_outdoor, 7, 1, 1, 150, 'שרון', 'approved')
  RETURNING id INTO i_tent;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status)
  VALUES (v_user, 'עגלת טיולון קלה', 'טיולון מתקפל ביד אחת, מתאים עד 15 ק"ג. נוח לנסיעות.', c_baby, 8, 1, 1, 80, 'שרון', 'approved')
  RETURNING id INTO i_stroller;

  INSERT INTO public.items (owner_id, name, description, category_id, condition_rating, total_quantity, available_quantity, deposit_amount, area, approval_status) VALUES
    (v_user, 'מזוודת טרולי לעלייה למטוס', 'מזוודה קטנה במידות המותרות לתא הנוסעים.', c_luggage, 9, 2, 2, 50, 'שרון', 'approved'),
    (v_user, 'ערכת כלי גינון', 'מגרפה, את חפירה, מזמרה וכפפות.', c_tools, 7, 1, 1, 0, 'שרון', 'approved'),
    (v_user, 'צידנית 40 ליטר', 'צידנית קשיחה ששומרת על קור יום שלם.', c_outdoor, 8, 1, 1, 0, 'שרון', 'approved'),
    (v_user, 'מיטת תינוק מתקפלת', 'לול-מיטה מתקפל עם מזרן, לאירוח נכדים או לנסיעה.', c_baby, 7, 1, 1, 60, 'שרון', 'approved'),
    (v_user, 'רמקול בלוטות'' לאירועים', 'רמקול נייד חזק עם מיקרופון. סוללה ל-8 שעות.', c_events, 8, 1, 1, 120, 'שרון', 'approved'),
    -- Still waiting for admin approval, to demonstrate the admin panel.
    (v_user, 'מנגל פחמים גדול', 'מנגל על גלגלים עם מכסה, מתאים ל-15 סועדים.', c_events, 6, 1, 1, 0, 'שרון', 'pending');

  -- Loans in every state ------------------------------------------------------

  -- 1. Pending request (waits for the demo admin to approve).
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status)
  VALUES (i_drill, v_user, v_today + 5, v_today + 7, 1, 'pending');

  -- 2. Active loan with deposit received, due tomorrow (gets the reminder e-mail).
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status)
  VALUES (i_urn, v_user, v_today - 2, v_today + 1, 1, 'approved') RETURNING id INTO r;
  INSERT INTO public.loans (borrow_request_id, status, deposit_received) VALUES (r, 'active', TRUE);
  UPDATE public.items SET available_quantity = available_quantity - 1 WHERE id = i_urn;

  -- 3. Overdue loan.
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status)
  VALUES (i_ladder, v_user, v_today - 10, v_today - 3, 1, 'approved') RETURNING id INTO r;
  INSERT INTO public.loans (borrow_request_id, status) VALUES (r, 'late');
  UPDATE public.items SET available_quantity = available_quantity - 1 WHERE id = i_ladder;

  -- 4. Borrower marked as returned; owner still has to confirm.
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status)
  VALUES (i_suitcase, v_admin, v_today - 8, v_today - 1, 1, 'approved') RETURNING id INTO r;
  INSERT INTO public.loans (borrow_request_id, status, actual_return_date, deposit_received)
  VALUES (r, 'returned_pending_confirmation', v_today - 1, TRUE);
  UPDATE public.items SET available_quantity = available_quantity - 1 WHERE id = i_suitcase;

  -- 5. Completed loan (history).
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status)
  VALUES (i_catan, v_user, v_today - 30, v_today - 27, 1, 'approved') RETURNING id INTO r;
  INSERT INTO public.loans (borrow_request_id, status, actual_return_date)
  VALUES (r, 'completed', v_today - 27);

  -- 6. Future loan of part of the stock (shows "partly free" in the calendar).
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status)
  VALUES (i_chairs, v_user, v_today + 10, v_today + 12, 12, 'approved') RETURNING id INTO r;
  INSERT INTO public.loans (borrow_request_id, status) VALUES (r, 'active');
  UPDATE public.items SET available_quantity = available_quantity - 12 WHERE id = i_chairs;

  -- 7. Rejected and pending requests on the member's items.
  INSERT INTO public.borrow_requests (item_id, requester_id, start_date, end_date, requested_quantity, status) VALUES
    (i_tent, v_admin, v_today + 14, v_today + 17, 1, 'pending'),
    (i_stroller, v_admin, v_today - 20, v_today - 18, 1, 'rejected');
END;
$$;
