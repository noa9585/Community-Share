# מודל הנתונים

מקור האמת הוא קובצי ה-SQL שב-`supabase/migrations/`. כל המפתחות הראשיים הם `UUID` שנוצר במסד.
תרשים הקשרים: [`ERD.md`](ERD.md).

## `users` – חברי הקהילה

שורה אחת לכל משתמש רשום. נוצרת אוטומטית ב-trigger כשנוצר חשבון ב-Supabase Auth.

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK, FK ← `auth.users(id)` ON DELETE CASCADE | אותו מזהה כמו בחשבון ה-Auth |
| `full_name` | TEXT | NOT NULL, 2–100 תווים | |
| `email` | TEXT | NOT NULL, עד 320 תווים | מועתק מה-Auth; המשתמש לא יכול לשנות |
| `residence_area` | TEXT | NOT NULL, FK ← `areas(name)` ON UPDATE CASCADE | |
| `role` | TEXT | NOT NULL, ברירת מחדל `regular` | `regular` / `admin` |
| `status` | TEXT | NOT NULL, ברירת מחדל `pending` | ראו למטה |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**סטטוס משתמש:** `pending` – נרשם וממתין לאישור אדמין, רואה רק את מסך ההמתנה ·
`approved` – חבר פעיל · `blocked` – נחסם על ידי אדמין, מאבד גישה מיידית.

הסיסמה אינה נשמרת בטבלה הזו; Supabase Auth שומר אותה מגובבת.

## `areas` – אזורים

הרשימה שמופיעה בהרשמה, בפרופיל, בהוספת פריט ובסינון הקטלוג. האדמין מנהל אותה (migration `007`).

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `name` | TEXT | NOT NULL, UNIQUE, 2–40 תווים | המשתמשים והפריטים מצביעים על השם |
| `sort_order` | INT | NOT NULL | סדר ההצגה |

המפתח הזר על השם מוגדר `ON UPDATE CASCADE`: שינוי שם של אזור מתעדכן מיד אצל כל החברים והפריטים
שבו. אזור שיש בו חברים או פריטים לא ניתן למחיקה.

## `categories` – קטגוריות

האדמין מוסיף, משנה שם ואייקון, ומוחק קטגוריה שאין בה פריטים.

| שדה | סוג | אילוצים |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL, UNIQUE |
| `icon` | TEXT | NOT NULL – שם אייקון (Material Symbols) |

## `items` – פריטים להשאלה

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `owner_id` | UUID | NOT NULL, FK ← `users` ON DELETE CASCADE | בעל הפריט |
| `category_id` | UUID | FK ← `categories` ON DELETE SET NULL | |
| `name` | TEXT | NOT NULL, 2–100 תווים | |
| `description` | TEXT | עד 2,000 תווים | |
| `condition_rating` | INT | NOT NULL, 1–10 | מצב הפריט |
| `total_quantity` | INT | NOT NULL, 1–1,000 | כמה יחידות קיימות |
| `available_quantity` | INT | NOT NULL, 0 עד `total_quantity` | כמה יחידות לא מושאלות כרגע |
| `deposit_amount` | NUMERIC(10,2) | NOT NULL, 0–100,000 | פיקדון בש"ח, מנוהל ידנית |
| `area` | TEXT | NOT NULL, FK ← `areas(name)` ON UPDATE CASCADE | |
| `approval_status` | TEXT | NOT NULL, ברירת מחדל `pending` | ראו למטה |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**סטטוס אישור:** `pending` – ממתין לאדמין, גלוי רק לבעלים ולאדמין · `approved` – מופיע בקטלוג ·
`rejected` – נדחה; עריכה מחזירה אותו ל-`pending`.

שינוי שם, תיאור, קטגוריה או הוספת תמונה לפריט מאושר מחזירים אותו ל-`pending`, כדי שמה שמופיע
בקטלוג יהיה תמיד מה שהאדמין אישר.

## `item_images` – תמונות

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `item_id` | UUID | NOT NULL, FK ← `items` ON DELETE CASCADE | |
| `storage_path` | TEXT | NOT NULL, UNIQUE | נתיב ב-bucket הפרטי: `<בעלים>/<פריט>/<uuid>.jpg` |
| `sort_order` | INT | NOT NULL, 0–100 | התמונה הראשונה היא תמונת השער |

עד 5 תמונות לפריט. נשמר רק הנתיב; הקישור עצמו נוצר בכל טעינה כקישור חתום שתקף לשעה.

## `borrow_requests` – בקשות השאלה

| שדה | סוג | אילוצים |
|---|---|---|
| `id` | UUID | PK |
| `item_id` | UUID | NOT NULL, FK ← `items` ON DELETE CASCADE |
| `requester_id` | UUID | NOT NULL, FK ← `users` ON DELETE CASCADE |
| `start_date`, `end_date` | DATE | NOT NULL, `end_date >= start_date`, עד 90 יום |
| `requested_quantity` | INT | NOT NULL, 1–1,000 |
| `status` | TEXT | NOT NULL, ברירת מחדל `pending` |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**סטטוס בקשה:** `pending` – ממתינה לבעל הפריט · `approved` – אושרה ונוצרה השאלה ·
`rejected` – נדחתה על ידי הבעלים · `cancelled` – בוטלה על ידי המבקש לפני שנענתה.

## `loans` – השאלות

נוצרת רק כשבקשה מאושרת. מצביעה על הבקשה, שממנה נלקחים הפריט, השואל, התאריכים והכמות – כך אין שני
מקומות שבהם אותו מידע יכול לסתור את עצמו.

| שדה | סוג | אילוצים |
|---|---|---|
| `id` | UUID | PK |
| `borrow_request_id` | UUID | NOT NULL, **UNIQUE**, FK ← `borrow_requests` ON DELETE CASCADE |
| `status` | TEXT | NOT NULL, ברירת מחדל `active` |
| `actual_return_date` | DATE | |
| `deposit_received` | BOOLEAN | NOT NULL, ברירת מחדל `false` |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**סטטוס השאלה:** `active` – הפריט אצל השואל (או מוזמן לתאריך עתידי) ·
`returned_pending_confirmation` – השואל סימן שהחזיר, ממתין לאישור הבעלים ·
`completed` – הבעלים אישר, המלאי שוחרר · `late` – מועד ההחזרה עבר.

ה-UNIQUE על `borrow_request_id` מבטיח שבקשה אחת לא תהפוך לשתי השאלות.

## `email_log` – יומן מיילים

| שדה | סוג | הערות |
|---|---|---|
| `id` | UUID | PK |
| `type` | TEXT | אחד משמונה סוגי ההודעות (CHECK) |
| `recipient_user_id` | UUID | FK ← `users` ON DELETE SET NULL |
| `related_id` | UUID | הבקשה, ההשאלה, הפריט או המשתמש שההודעה עוסקת בהם |
| `status` | TEXT | `sent` / `failed` / `skipped` (אין מפתח API) |
| `sent_at` | TIMESTAMPTZ | |

משמש למניעת שליחה כפולה של תזכורות ולהצגה בפאנל האדמין. לא נשמרים בו תוכן ההודעה או כתובת הנמען.

## `conversations` – שיחות

שיחה אחת לכל צמד של פריט וחבר מתעניין. נפתחת כשחבר שואל שאלה מעמוד הפריט, או אוטומטית כשנשלחת בקשת
השאלה.

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `item_id` | UUID | NOT NULL, FK ← `items` ON DELETE CASCADE | הפריט שעליו מדברים |
| `owner_id` | UUID | NOT NULL, FK ← `users` | בעל הפריט (מועתק מהפריט) |
| `member_id` | UUID | NOT NULL, FK ← `users` | החבר המתעניין / השואל |
| `owner_last_read_at`, `member_last_read_at` | TIMESTAMPTZ | NOT NULL | עד איפה כל צד קרא; מזה מחושב "לא נקרא" |
| `last_message_at` | TIMESTAMPTZ | NOT NULL | למיון רשימת השיחות |

`UNIQUE (item_id, member_id)` מבטיח שיחה אחת לכל צמד, ו-`CHECK (owner_id <> member_id)` מונע שיחה של אדם
עם עצמו.

## `messages` – הודעות

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `conversation_id` | UUID | NOT NULL, FK ← `conversations` ON DELETE CASCADE | |
| `sender_id` | UUID | FK ← `users` ON DELETE SET NULL | ריק בהודעת מערכת |
| `kind` | TEXT | `text` / `image` / `system` | |
| `body` | TEXT | עד 2,000 תווים | |
| `image_path` | TEXT | UNIQUE | נתיב ב-bucket הפרטי `chat-images` |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

הודעות `system` נכתבות על ידי המסד עצמו כשמשהו קורה בהשאלה ("נשלחה בקשה", "הבקשה אושרה", "הפריט סומן
כהוחזר"), כך שכל ההיסטוריה של השאלה מופיעה ברצף אחד עם התיאום בין הצדדים.

## `notifications` – התראות

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK ← `users` ON DELETE CASCADE | למי ההתראה |
| `type` | TEXT | אחד מ-17 סוגים (CHECK) | בקשה חדשה, אישור, דחייה, תזכורת, איחור, הודעה חדשה ועוד |
| `title`, `body` | TEXT | עד 120 / 300 תווים | |
| `link` | TEXT | חייב להיות נתיב פנימי באתר (CHECK) | לאן ההתראה מובילה |
| `related_id` | UUID | | הבקשה, ההשאלה, הפריט, השיחה או הדיווח |
| `read_at` | TIMESTAMPTZ | | ריק = לא נקראה |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

ההתראות נוצרות ב-triggers, באותה טרנזקציה של האירוע: אם הבקשה נשמרה, ההתראה קיימת. להודעות צ'אט יש
התראה אחת שלא נקראה לכל שיחה, שמתעדכנת, כדי שרצף הודעות לא יציף את הרשימה.

## `reports` – דיווחים

| שדה | סוג | אילוצים | הערות |
|---|---|---|---|
| `id` | UUID | PK | |
| `reporter_id` | UUID | NOT NULL, FK ← `users` | מי דיווח |
| `target_type` | TEXT | `item` / `user` | |
| `item_id` | UUID | FK ← `items` ON DELETE SET NULL | בדיווח על פריט |
| `reported_user_id` | UUID | FK ← `users` ON DELETE SET NULL | המשתמש, או בעל הפריט |
| `target_label` | TEXT | NOT NULL | שם הפריט או המשתמש בזמן הדיווח, כדי שהדיווח יישאר קריא גם אם היעד נמחק |
| `reason` | TEXT | `damaged` / `misleading` / `not_returned` / `behavior` / `other` | |
| `details` | TEXT | 5–1,000 תווים | |
| `status` | TEXT | `open` / `in_progress` / `resolved` / `dismissed` | |
| `admin_note` | TEXT | עד 1,000 תווים | הערה פנימית של האדמין |
| `handled_by`, `handled_at` | UUID, TIMESTAMPTZ | | מי טיפל ומתי |

## טבלאות תשתית

- **`admin_audit_log`** – לוג פעולות האדמין: מי אישר, חסם, הסיר פריט, סגר השאלה או טיפל בדיווח, ומתי.
- **`rate_limits`** – מונים להגבלת קצב. המפתח הוא גיבוב SHA-256, כך שכתובות IP ואימיילים אינם נשמרים.

## חישוב זמינות

הזמינות אינה שדה אלא חישוב: לכל יום בטווח המבוקש סופרים כמה יחידות תפוסות בהשאלות שלא הסתיימו, ובודקים
ש-`total_quantity` פחות המקסימום היומי מספיק לכמות המבוקשת. השאלה שמועדה עבר ולא הוחזרה ממשיכה לתפוס
את הפריט עד שהבעלים מאשר החזרה.

| פונקציה | תפקיד |
|---|---|
| `check_item_availability(item, start, end, qty)` | האם הכמות פנויה בכל ימי הטווח |
| `create_borrow_request(...)` | בודקת תאריכים, בעלות וזמינות, ויוצרת בקשה |
| `approve_borrow_request(request)` | **טרנזקציה אחת:** נועלת את הפריט, בודקת זמינות שוב, מאשרת, מעדכנת מלאי ויוצרת השאלה |
| `confirm_loan_return(loan)` | סוגרת את ההשאלה ומחזירה את הכמות למלאי |

נעילת שורת הפריט בזמן האישור מונעת מצב שבו שתי בקשות על אותה יחידה מאושרות בו-זמנית.

## פונקציות הצ'אט, ההתראות והדיווחים

| פונקציה | תפקיד |
|---|---|
| `start_conversation(item, member)` | פותחת או מחזירה את השיחה על פריט |
| `send_message(conversation, body, image_path)` | שולחת הודעה ומעדכנת את ההתראה של הצד השני |
| `mark_conversation_read(conversation)` | מסמנת שהמשתמש קרא את השיחה |
| `get_my_conversations()`, `get_unread_counts()` | רשימת השיחות והמונים שבתפריט |
| `mark_notifications_read(ids)` | מסמנת התראות כנקראו |
| `create_report(type, target, reason, details)` | יוצרת דיווח ומודיעה לאדמינים |
| `admin_update_report(report, status, note)` | אדמין מעדכן סטטוס טיפול |
| `admin_close_loan(loan)` | אדמין סוגר השאלה תקועה ומשחרר מלאי |
| `admin_stats()` | הסטטיסטיקות של פאנל הניהול |

## פונקציות ניהול הקטגוריות והאזורים

| פונקציה | תפקיד |
|---|---|
| `admin_save_category(id, name, icon)`, `admin_delete_category(id)` | הוספה, עריכה ומחיקה של קטגוריה (מחיקה רק כשאין בה פריטים) |
| `admin_save_area(id, name)`, `admin_delete_area(id)` | הוספה, שינוי שם ומחיקה של אזור (מחיקה רק כשאין בו חברים או פריטים) |
| `admin_taxonomy_usage()` | כמה פריטים בכל קטגוריה, וכמה חברים ופריטים בכל אזור |

כל הפעולות האלה נרשמות ביומן פעולות האדמין.
