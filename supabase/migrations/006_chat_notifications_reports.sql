-- Chat, in-app notifications, reports, admin tools and Realtime.
-- Additive only: nothing existing is dropped or rewritten.
--
-- Same model as before: clients may only SELECT (filtered by RLS) and every
-- write is a SECURITY DEFINER function or a trigger. Notifications and the
-- automatic chat messages are produced by triggers, so they are written in the
-- same transaction as the change they describe and cannot be forged or skipped.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One conversation per item and interested member. The owner is copied from
-- the item (an item never changes hands) so policies need no join.
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member_last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, member_id),
  CHECK (owner_id <> member_id)
);

-- kind = 'system' rows are written by triggers and have no sender.
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'image', 'system')),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  image_path TEXT UNIQUE CHECK (image_path IS NULL OR char_length(image_path) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind <> 'image' OR image_path IS NOT NULL),
  CHECK (kind = 'image' OR char_length(body) >= 1)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'request_created',
    'request_approved',
    'request_rejected',
    'request_cancelled',
    'return_marked',
    'loan_completed',
    'loan_closed_by_admin',
    'return_reminder',
    'loan_overdue',
    'new_message',
    'user_approved',
    'item_approved',
    'item_rejected',
    'user_pending',
    'item_pending',
    'report_created',
    'report_updated'
  )),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 300),
  -- Always a path inside the site, never a full URL.
  link TEXT NOT NULL DEFAULT '/' CHECK (link ~ '^/[A-Za-z0-9/_?=&-]{0,200}$'),
  related_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- target_label keeps the item or member name as it was when reported, so the
-- report stays readable after its target is deleted.
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('item', 'user')),
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_label TEXT NOT NULL CHECK (char_length(target_label) <= 100),
  reason TEXT NOT NULL CHECK (reason IN ('damaged', 'misleading', 'not_returned', 'behavior', 'other')),
  details TEXT NOT NULL CHECK (char_length(details) BETWEEN 5 AND 1000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  admin_note TEXT CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  handled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_owner_id ON public.conversations(owner_id);
CREATE INDEX idx_conversations_member_id ON public.conversations(member_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_reporter_id ON public.reports(reporter_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND auth.uid() IN (owner_id, member_id)
  );
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Chats are private to their two participants. Admins are deliberately not
-- included: a problem in a chat reaches them through a report.
CREATE POLICY conversations_select ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_approved_user() AND auth.uid() IN (owner_id, member_id));

CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_approved_user() AND public.is_conversation_participant(conversation_id));

CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- The reported member never sees the report or who filed it.
CREATE POLICY reports_select ON public.reports
  FOR SELECT TO authenticated
  USING (public.is_approved_user() AND (reporter_id = auth.uid() OR public.is_admin()));

REVOKE ALL ON public.conversations, public.messages, public.notifications, public.reports
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.conversations, public.messages, public.notifications, public.reports
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link TEXT,
  p_related_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (user_id, type, title, body, link, related_id)
  SELECT p_user_id, p_type, left(p_title, 120), left(COALESCE(p_body, ''), 300), p_link, p_related_id
  WHERE p_user_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link TEXT,
  p_related_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (user_id, type, title, body, link, related_id)
  SELECT u.id, p_type, left(p_title, 120), left(COALESCE(p_body, ''), 300), p_link, p_related_id
  FROM public.users u
  WHERE u.role = 'admin' AND u.status = 'approved';
$$;

-- Writes an automatic message into the chat of an item and a member,
-- opening the conversation if the two have not talked yet.
CREATE OR REPLACE FUNCTION public.post_system_message(
  p_item_id UUID,
  p_member_id UUID,
  p_body TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner UUID;
  v_conversation UUID;
  v_actor UUID := auth.uid();
BEGIN
  SELECT owner_id INTO v_owner FROM public.items WHERE id = p_item_id;
  IF v_owner IS NULL OR v_owner = p_member_id THEN
    RETURN;
  END IF;

  INSERT INTO public.conversations (item_id, owner_id, member_id)
  VALUES (p_item_id, v_owner, p_member_id)
  ON CONFLICT (item_id, member_id) DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_conversation;

  -- The member whose own action produced this message has already "seen" it:
  -- if they had nothing unread, keep it that way.
  UPDATE public.conversations c
  SET owner_last_read_at = CASE WHEN c.owner_id = v_actor THEN now() ELSE c.owner_last_read_at END,
      member_last_read_at = CASE WHEN c.member_id = v_actor THEN now() ELSE c.member_last_read_at END
  WHERE c.id = v_conversation
    AND v_actor IN (c.owner_id, c.member_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id IS DISTINCT FROM v_actor
        AND m.created_at > CASE
          WHEN c.owner_id = v_actor THEN c.owner_last_read_at
          ELSE c.member_last_read_at
        END
    );

  INSERT INTO public.messages (conversation_id, sender_id, kind, body)
  VALUES (v_conversation, NULL, 'system', left(p_body, 2000));
END;
$$;

CREATE OR REPLACE FUNCTION public.format_date(p_date DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT to_char(p_date, 'DD/MM/YYYY');
$$;

-- ---------------------------------------------------------------------------
-- Triggers: notifications and automatic chat messages
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.on_borrow_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item_name TEXT;
  v_owner UUID;
  v_requester_name TEXT;
  v_dates TEXT := public.format_date(NEW.start_date) || ' – ' || public.format_date(NEW.end_date);
BEGIN
  SELECT name, owner_id INTO v_item_name, v_owner FROM public.items WHERE id = NEW.item_id;
  SELECT full_name INTO v_requester_name FROM public.users WHERE id = NEW.requester_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(
      v_owner, 'request_created', 'בקשת השאלה חדשה',
      v_requester_name || ' מבקש/ת לשאול את "' || v_item_name || '" בתאריכים ' || v_dates,
      '/my-items', NEW.id
    );
    PERFORM public.post_system_message(
      NEW.item_id, NEW.requester_id,
      'נשלחה בקשת השאלה לתאריכים ' || v_dates || ' (כמות: ' || NEW.requested_quantity || ').'
    );
  ELSIF NEW.status = 'approved' THEN
    PERFORM public.notify(
      NEW.requester_id, 'request_approved', 'הבקשה שלך אושרה',
      'אפשר לתאם בצ''אט את האיסוף של "' || v_item_name || '" (' || v_dates || ').',
      '/my-loans?tab=active', NEW.id
    );
    PERFORM public.post_system_message(
      NEW.item_id, NEW.requester_id, 'הבקשה אושרה. אפשר לתאם כאן את האיסוף וההחזרה.'
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM public.notify(
      NEW.requester_id, 'request_rejected', 'הבקשה שלך נדחתה',
      'הבקשה לשאול את "' || v_item_name || '" (' || v_dates || ') לא אושרה.',
      '/my-loans', NEW.id
    );
    PERFORM public.post_system_message(NEW.item_id, NEW.requester_id, 'הבקשה נדחתה.');
  ELSIF NEW.status = 'cancelled' THEN
    PERFORM public.notify(
      v_owner, 'request_cancelled', 'בקשת השאלה בוטלה',
      v_requester_name || ' ביטל/ה את הבקשה לשאול את "' || v_item_name || '".',
      '/my-items', NEW.id
    );
    PERFORM public.post_system_message(NEW.item_id, NEW.requester_id, 'הבקשה בוטלה על ידי המבקש/ת.');
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER borrow_requests_notify_insert
  AFTER INSERT ON public.borrow_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_borrow_request_change();

CREATE TRIGGER borrow_requests_notify_status
  AFTER UPDATE OF status ON public.borrow_requests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.on_borrow_request_change();

CREATE OR REPLACE FUNCTION public.on_loan_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.borrow_requests%ROWTYPE;
  v_item_name TEXT;
  v_owner UUID;
BEGIN
  SELECT * INTO v_request FROM public.borrow_requests WHERE id = NEW.borrow_request_id;
  SELECT name, owner_id INTO v_item_name, v_owner FROM public.items WHERE id = v_request.item_id;

  IF NEW.status = 'returned_pending_confirmation' THEN
    PERFORM public.notify(
      v_owner, 'return_marked', 'פריט סומן כהוחזר',
      '"' || v_item_name || '" סומן כהוחזר. נא לאשר את ההחזרה כדי לסגור את ההשאלה.',
      '/my-items', NEW.id
    );
    PERFORM public.post_system_message(
      v_request.item_id, v_request.requester_id,
      'השואל/ת סימן/ה שהפריט הוחזר. ממתין לאישור בעל/ת הפריט.'
    );
  ELSIF NEW.status = 'completed' THEN
    PERFORM public.notify(
      v_request.requester_id, 'loan_completed', 'ההשאלה נסגרה',
      'ההחזרה של "' || v_item_name || '" אושרה. תודה!',
      '/my-loans?tab=completed', NEW.id
    );
    PERFORM public.post_system_message(
      v_request.item_id, v_request.requester_id, 'ההחזרה אושרה וההשאלה נסגרה.'
    );
  ELSIF NEW.status = 'late' THEN
    PERFORM public.notify(
      v_request.requester_id, 'loan_overdue', 'השאלה באיחור',
      'מועד ההחזרה של "' || v_item_name || '" היה ב-' || public.format_date(v_request.end_date) || '. נא להחזיר בהקדם.',
      '/my-loans?tab=late', NEW.id
    );
    PERFORM public.notify(
      v_owner, 'loan_overdue', 'פריט שלך לא הוחזר בזמן',
      '"' || v_item_name || '" היה אמור לחזור ב-' || public.format_date(v_request.end_date) || '.',
      '/my-items', NEW.id
    );
    PERFORM public.post_system_message(
      v_request.item_id, v_request.requester_id, 'מועד ההחזרה עבר והפריט טרם סומן כהוחזר.'
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER loans_notify_status
  AFTER UPDATE OF status ON public.loans
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.on_loan_status_change();

CREATE OR REPLACE FUNCTION public.on_item_approval_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    PERFORM public.notify_admins(
      'item_pending', 'פריט ממתין לאישור', '"' || NEW.name || '"', '/admin?tab=items', NEW.id
    );
  ELSIF NEW.approval_status = 'approved' THEN
    PERFORM public.notify(
      NEW.owner_id, 'item_approved', 'הפריט שלך אושר',
      '"' || NEW.name || '" מופיע עכשיו בקטלוג הקהילה.',
      '/items/' || NEW.id, NEW.id
    );
  ELSIF NEW.approval_status = 'rejected' THEN
    PERFORM public.notify(
      NEW.owner_id, 'item_rejected', 'הפריט לא מופיע בקטלוג',
      '"' || NEW.name || '" לא אושר על ידי מנהל הקהילה. אפשר לערוך אותו ולשלוח שוב.',
      '/items/' || NEW.id, NEW.id
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER items_notify_insert
  AFTER INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.on_item_approval_change();

CREATE TRIGGER items_notify_approval
  AFTER UPDATE OF approval_status ON public.items
  FOR EACH ROW WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION public.on_item_approval_change();

-- Runs inside the sign-up transaction, so it must never be the reason a
-- registration fails: any error here is swallowed.
CREATE OR REPLACE FUNCTION public.on_user_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
      PERFORM public.notify_admins(
        'user_pending', 'משתמש חדש ממתין לאישור', NEW.full_name, '/admin?tab=users', NEW.id
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
      PERFORM public.notify(
        NEW.id, 'user_approved', 'ברוך הבא לקהילה',
        'החשבון שלך אושר. אפשר לחפש ציוד בקטלוג ולשתף פריטים משלך.',
        '/catalog', NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

CREATE TRIGGER users_notify_insert
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.on_user_status_change();

CREATE TRIGGER users_notify_status
  AFTER UPDATE OF status ON public.users
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.on_user_status_change();

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------

-- A member opens a chat about an item with its owner. The owner can open one
-- only with a member who already sent a request for that item, so owners
-- cannot message arbitrary members.
CREATE OR REPLACE FUNCTION public.start_conversation(p_item_id UUID, p_member_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_owner UUID;
  v_status TEXT;
  v_member UUID;
  v_id UUID;
BEGIN
  SELECT owner_id, approval_status INTO v_owner, v_status
  FROM public.items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  IF v_owner = v_uid THEN
    v_member := p_member_id;
    IF v_member IS NULL OR v_member = v_uid THEN
      RAISE EXCEPTION 'CS:INVALID_INPUT';
    END IF;
  ELSE
    v_member := v_uid;
  END IF;

  SELECT id INTO v_id
  FROM public.conversations
  WHERE item_id = p_item_id AND member_id = v_member;

  IF FOUND THEN
    RETURN v_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.borrow_requests
    WHERE item_id = p_item_id AND requester_id = v_member
  ) THEN
    IF v_owner = v_uid THEN
      RAISE EXCEPTION 'CS:FORBIDDEN';
    ELSIF v_status <> 'approved' THEN
      RAISE EXCEPTION 'CS:NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.conversations (item_id, owner_id, member_id)
  VALUES (p_item_id, v_owner, v_member)
  ON CONFLICT (item_id, member_id) DO UPDATE SET item_id = EXCLUDED.item_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_body TEXT,
  p_image_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_conversation public.conversations%ROWTYPE;
  v_body TEXT := btrim(COALESCE(p_body, ''));
  v_other UUID;
  v_sender_name TEXT;
  v_preview TEXT;
  v_id UUID;
BEGIN
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND OR v_uid NOT IN (v_conversation.owner_id, v_conversation.member_id) THEN
    RAISE EXCEPTION 'CS:FORBIDDEN';
  END IF;

  IF char_length(v_body) > 2000 OR (p_image_path IS NULL AND char_length(v_body) = 0) THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  -- The picture must sit in the sender's own folder of this conversation.
  IF p_image_path IS NOT NULL AND p_image_path !~ (
    '^' || p_conversation_id::text || '/' || v_uid::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, kind, body, image_path)
  VALUES (
    p_conversation_id,
    v_uid,
    CASE WHEN p_image_path IS NULL THEN 'text' ELSE 'image' END,
    v_body,
    p_image_path
  )
  RETURNING id INTO v_id;

  UPDATE public.conversations
  SET last_message_at = now(),
      owner_last_read_at = CASE WHEN owner_id = v_uid THEN now() ELSE owner_last_read_at END,
      member_last_read_at = CASE WHEN member_id = v_uid THEN now() ELSE member_last_read_at END
  WHERE id = p_conversation_id;

  v_other := CASE
    WHEN v_conversation.owner_id = v_uid THEN v_conversation.member_id
    ELSE v_conversation.owner_id
  END;
  SELECT full_name INTO v_sender_name FROM public.users WHERE id = v_uid;
  v_preview := CASE WHEN v_body = '' THEN 'תמונה' ELSE left(v_body, 140) END;

  -- One unread notification per conversation: a burst of messages refreshes it
  -- instead of filling the recipient's list.
  UPDATE public.notifications
  SET body = v_preview, created_at = now()
  WHERE user_id = v_other
    AND type = 'new_message'
    AND related_id = p_conversation_id
    AND read_at IS NULL;

  IF NOT FOUND THEN
    PERFORM public.notify(
      v_other, 'new_message', 'הודעה חדשה מ' || v_sender_name, v_preview,
      '/messages/' || p_conversation_id, p_conversation_id
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
BEGIN
  UPDATE public.conversations
  SET owner_last_read_at = CASE WHEN owner_id = v_uid THEN now() ELSE owner_last_read_at END,
      member_last_read_at = CASE WHEN member_id = v_uid THEN now() ELSE member_last_read_at END
  WHERE id = p_conversation_id
    AND v_uid IN (owner_id, member_id);

  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = v_uid
    AND type = 'new_message'
    AND related_id = p_conversation_id
    AND read_at IS NULL;
END;
$$;

-- The caller's conversations that have at least one message, newest first.
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  id UUID,
  item_id UUID,
  owner_id UUID,
  member_id UUID,
  last_message_at TIMESTAMPTZ,
  last_kind TEXT,
  last_body TEXT,
  unread_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id, c.item_id, c.owner_id, c.member_id, c.last_message_at, lm.kind, lm.body,
         (
           SELECT count(*)::int
           FROM public.messages m
           WHERE m.conversation_id = c.id
             AND m.sender_id IS DISTINCT FROM auth.uid()
             AND m.created_at > CASE
               WHEN c.owner_id = auth.uid() THEN c.owner_last_read_at
               ELSE c.member_last_read_at
             END
         )
  FROM public.conversations c
  JOIN LATERAL (
    SELECT m.kind, m.body
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  WHERE public.is_approved_user()
    AND auth.uid() IN (c.owner_id, c.member_id)
  ORDER BY c.last_message_at DESC
  LIMIT 100;
$$;

-- Numbers for the badges in the navigation.
CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE (notifications INT, conversations INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (
      SELECT count(*)::int
      FROM public.notifications n
      WHERE n.user_id = auth.uid() AND n.read_at IS NULL
    ),
    (
      SELECT count(*)::int
      FROM public.conversations c
      WHERE auth.uid() IN (c.owner_id, c.member_id)
        AND EXISTS (
          SELECT 1 FROM public.messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id IS DISTINCT FROM auth.uid()
            AND m.created_at > CASE
              WHEN c.owner_id = auth.uid() THEN c.owner_last_read_at
              ELSE c.member_last_read_at
            END
        )
    )
  WHERE public.is_approved_user();
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Marks the given notifications as read, or all of the caller's when NULL.
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids UUID[] DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = v_uid
    AND read_at IS NULL
    AND (p_ids IS NULL OR id = ANY (p_ids[1:200]));
END;
$$;

-- Daily job: in-app reminder one day before a loan is due, once per loan.
CREATE OR REPLACE FUNCTION public.cron_create_return_reminders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, related_id)
  SELECT br.requester_id, 'return_reminder', 'מחר מועד ההחזרה',
         left('מחר צריך להחזיר את "' || i.name || '".', 300),
         '/my-loans?tab=active', l.id
  FROM public.loans l
  JOIN public.borrow_requests br ON br.id = l.borrow_request_id
  JOIN public.items i ON i.id = br.item_id
  WHERE l.status = 'active'
    AND br.end_date = public.today() + 1
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.type = 'return_reminder' AND n.related_id = l.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_report(
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_details TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := public.current_approved_uid();
  v_details TEXT := btrim(COALESCE(p_details, ''));
  v_item_id UUID;
  v_user_id UUID;
  v_label TEXT;
  v_id UUID;
BEGIN
  IF char_length(v_details) NOT BETWEEN 5 AND 1000
     OR p_reason IS NULL
     OR p_reason NOT IN ('damaged', 'misleading', 'not_returned', 'behavior', 'other') THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  IF p_target_type = 'item' THEN
    SELECT id, owner_id, name INTO v_item_id, v_user_id, v_label
    FROM public.items
    WHERE id = p_target_id;
  ELSIF p_target_type = 'user' THEN
    SELECT id, full_name INTO v_user_id, v_label
    FROM public.users
    WHERE id = p_target_id AND status <> 'pending';
  ELSE
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  IF v_user_id = v_uid THEN
    RAISE EXCEPTION 'CS:REPORT_SELF';
  END IF;

  IF (SELECT count(*) FROM public.reports
      WHERE reporter_id = v_uid AND status IN ('open', 'in_progress')) >= 10 THEN
    RAISE EXCEPTION 'CS:TOO_MANY_REPORTS';
  END IF;

  INSERT INTO public.reports (
    reporter_id, target_type, item_id, reported_user_id, target_label, reason, details
  )
  VALUES (v_uid, p_target_type, v_item_id, v_user_id, left(v_label, 100), p_reason, v_details)
  RETURNING id INTO v_id;

  PERFORM public.notify_admins(
    'report_created', 'דיווח חדש',
    CASE WHEN p_target_type = 'item' THEN 'על הפריט "' ELSE 'על המשתמש/ת "' END || v_label || '"',
    '/admin?tab=reports', v_id
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_report(
  p_report_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_report public.reports%ROWTYPE;
  v_note TEXT := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('in_progress', 'resolved', 'dismissed')
     OR char_length(COALESCE(v_note, '')) > 1000 THEN
    RAISE EXCEPTION 'CS:INVALID_INPUT';
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CS:NOT_FOUND';
  END IF;

  UPDATE public.reports
  SET status = p_status,
      admin_note = COALESCE(v_note, admin_note),
      handled_by = v_admin,
      handled_at = now()
  WHERE id = p_report_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'report_' || p_status, 'report', p_report_id);

  -- The reporter learns that the report was handled, never what was decided
  -- about the other member.
  IF p_status IS DISTINCT FROM v_report.status THEN
    PERFORM public.notify(
      v_report.reporter_id, 'report_updated',
      CASE p_status
        WHEN 'in_progress' THEN 'הדיווח שלך בטיפול'
        WHEN 'resolved' THEN 'הדיווח שלך טופל'
        ELSE 'הדיווח שלך נסגר'
      END,
      'דיווח על "' || v_report.target_label || '"',
      '/report', p_report_id
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

-- Closes a loan on the owner's behalf (for example when the owner does not
-- respond) and frees the stock. Recorded in the audit log.
CREATE OR REPLACE FUNCTION public.admin_close_loan(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := public.current_admin_uid();
  v_item_id UUID;
  v_item_name TEXT;
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

  SELECT owner_id, name INTO v_owner, v_item_name
  FROM public.items
  WHERE id = v_item_id
  FOR UPDATE;

  UPDATE public.loans
  SET status = 'completed',
      actual_return_date = COALESCE(actual_return_date, public.today())
  WHERE id = p_loan_id;

  UPDATE public.items
  SET available_quantity = LEAST(total_quantity, available_quantity + v_quantity)
  WHERE id = v_item_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'loan_force_close', 'loan', p_loan_id);

  -- The borrower is told by the loan trigger; the owner did not do this, so
  -- they are told who did.
  PERFORM public.notify(
    v_owner, 'loan_closed_by_admin', 'השאלה נסגרה על ידי מנהל הקהילה',
    'ההשאלה של "' || v_item_name || '" נסגרה והמלאי שוחרר.',
    '/my-items', p_loan_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.current_admin_uid();

  RETURN jsonb_build_object(
    'users', (
      SELECT jsonb_build_object(
        'total', count(*),
        'approved', count(*) FILTER (WHERE status = 'approved'),
        'pending', count(*) FILTER (WHERE status = 'pending'),
        'blocked', count(*) FILTER (WHERE status = 'blocked')
      ) FROM public.users
    ),
    'items', (
      SELECT jsonb_build_object(
        'total', count(*),
        'approved', count(*) FILTER (WHERE approval_status = 'approved'),
        'pending', count(*) FILTER (WHERE approval_status = 'pending'),
        'rejected', count(*) FILTER (WHERE approval_status = 'rejected')
      ) FROM public.items
    ),
    'requests', (
      SELECT jsonb_build_object(
        'total', count(*),
        'pending', count(*) FILTER (WHERE status = 'pending')
      ) FROM public.borrow_requests
    ),
    'loans', (
      SELECT jsonb_build_object(
        'active', count(*) FILTER (WHERE status = 'active'),
        'late', count(*) FILTER (WHERE status = 'late'),
        'awaiting', count(*) FILTER (WHERE status = 'returned_pending_confirmation'),
        'completed', count(*) FILTER (WHERE status = 'completed')
      ) FROM public.loans
    ),
    'openReports', (
      SELECT count(*) FROM public.reports WHERE status IN ('open', 'in_progress')
    ),
    'messages', (SELECT count(*) FROM public.messages WHERE kind <> 'system'),
    'topItems', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.name, 'loans', t.loans)), '[]'::jsonb)
      FROM (
        SELECT i.name, count(*) AS loans
        FROM public.loans l
        JOIN public.borrow_requests br ON br.id = l.borrow_request_id
        JOIN public.items i ON i.id = br.item_id
        GROUP BY i.id, i.name
        ORDER BY count(*) DESC, i.name
        LIMIT 5
      ) t
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Storage: pictures sent in chats
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  FALSE,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path layout: <conversation id>/<sender id>/<uuid>.<ext>. True when the caller
-- takes part in the conversation named by the first folder.
CREATE OR REPLACE FUNCTION public.can_access_chat_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_folder TEXT := split_part(p_name, '/', 1);
BEGIN
  IF v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN FALSE;
  END IF;
  RETURN public.is_approved_user() AND public.is_conversation_participant(v_folder::uuid);
END;
$$;

CREATE POLICY chat_images_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-images' AND public.can_access_chat_object(name));

CREATE POLICY chat_images_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND public.can_access_chat_object(name)
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY chat_images_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND public.is_approved_user()
    AND split_part(name, '/', 2) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime: the browser listens for changes (read-only). Each subscriber only
-- receives rows that the SELECT policies above let them read.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_table TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;

  FOREACH v_table IN ARRAY ARRAY['messages', 'notifications', 'borrow_requests', 'loans'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: nothing new is callable unless granted here.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.is_conversation_participant(UUID),
  public.notify(UUID, TEXT, TEXT, TEXT, TEXT, UUID),
  public.notify_admins(TEXT, TEXT, TEXT, TEXT, UUID),
  public.post_system_message(UUID, UUID, TEXT),
  public.format_date(DATE),
  public.on_borrow_request_change(),
  public.on_loan_status_change(),
  public.on_item_approval_change(),
  public.on_user_status_change(),
  public.start_conversation(UUID, UUID),
  public.send_message(UUID, TEXT, TEXT),
  public.mark_conversation_read(UUID),
  public.get_my_conversations(),
  public.get_unread_counts(),
  public.mark_notifications_read(UUID[]),
  public.cron_create_return_reminders(),
  public.create_report(TEXT, UUID, TEXT, TEXT),
  public.admin_update_report(UUID, TEXT, TEXT),
  public.admin_close_loan(UUID),
  public.admin_stats(),
  public.can_access_chat_object(TEXT)
FROM PUBLIC, anon, authenticated;

-- Needed by RLS and storage policies, which are evaluated as the querying user.
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_chat_object(TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.start_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_report(TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_loan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

GRANT EXECUTE ON FUNCTION public.cron_create_return_reminders() TO service_role;
