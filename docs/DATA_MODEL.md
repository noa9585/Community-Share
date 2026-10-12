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
| `residence_area` | TEXT | NOT NULL, אחד מששת האזורים | |
| `role` | TEXT | NOT NULL, ברירת מחדל `regular` | `regular` / `admin` |
| `status` | TEXT | NOT NULL, ברירת מחדל `pending` | ראו למטה |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**סטטוס משתמש:** `pending` – נרשם וממתין לאישור אדמין, רואה רק את מסך ההמתנה ·
`approved` – חבר פעיל · `blocked` – נחסם על ידי אדמין, מאבד גישה מיידית.

הסיסמה אינה נשמרת בטבלה הזו; Supabase Auth שומר אותה מגובבת.

## `categories` – קטגוריות

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
| `area` | TEXT | NOT NULL, אחד מששת האזורים | |
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

## טבלאות תשתית

- **`admin_audit_log`** – מי אישר או חסם את מי, ומתי.
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
