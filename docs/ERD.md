# תרשים ישויות וקשרים (ERD)

```mermaid
erDiagram
    AUTH_USERS ||--|| USERS : "פרופיל (נוצר ב-trigger)"
    USERS ||--o{ ITEMS : "בעלים של"
    CATEGORIES ||--o{ ITEMS : "מסווגת"
    ITEMS ||--o{ ITEM_IMAGES : "תמונות"
    ITEMS ||--o{ BORROW_REQUESTS : "מבוקש ב"
    USERS ||--o{ BORROW_REQUESTS : "מבקש"
    BORROW_REQUESTS ||--o| LOANS : "הופכת להשאלה באישור"
    ITEMS ||--o{ CONVERSATIONS : "שיחה על"
    USERS ||--o{ CONVERSATIONS : "בעלים / מתעניין"
    CONVERSATIONS ||--o{ MESSAGES : "הודעות"
    USERS ||--o{ MESSAGES : "שולח"
    USERS ||--o{ NOTIFICATIONS : "מקבל"
    USERS ||--o{ REPORTS : "מדווח / מדווח עליו"
    ITEMS ||--o{ REPORTS : "דיווח על"
    USERS ||--o{ EMAIL_LOG : "נמען"
    USERS ||--o{ ADMIN_AUDIT_LOG : "אדמין שביצע"

    USERS {
        uuid id PK "FK ל-auth.users"
        text full_name
        text email
        text residence_area
        text role "regular | admin"
        text status "pending | approved | blocked"
        timestamptz created_at
    }
    CATEGORIES {
        uuid id PK
        text name UK
        text icon
    }
    ITEMS {
        uuid id PK
        uuid owner_id FK
        uuid category_id FK
        text name
        text description
        int condition_rating "1-10"
        int total_quantity
        int available_quantity
        numeric deposit_amount
        text area
        text approval_status "pending | approved | rejected"
        timestamptz created_at
    }
    ITEM_IMAGES {
        uuid id PK
        uuid item_id FK
        text storage_path UK
        int sort_order
    }
    BORROW_REQUESTS {
        uuid id PK
        uuid item_id FK
        uuid requester_id FK
        date start_date
        date end_date
        int requested_quantity
        text status "pending | approved | rejected | cancelled"
        timestamptz created_at
    }
    LOANS {
        uuid id PK
        uuid borrow_request_id FK,UK
        text status "active | returned_pending_confirmation | completed | late"
        date actual_return_date
        boolean deposit_received
        timestamptz created_at
    }
    CONVERSATIONS {
        uuid id PK
        uuid item_id FK
        uuid owner_id FK
        uuid member_id FK
        timestamptz owner_last_read_at
        timestamptz member_last_read_at
        timestamptz last_message_at
    }
    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK "ריק בהודעת מערכת"
        text kind "text | image | system"
        text body
        text image_path UK
        timestamptz created_at
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        text title
        text body
        text link
        uuid related_id
        timestamptz read_at
        timestamptz created_at
    }
    REPORTS {
        uuid id PK
        uuid reporter_id FK
        text target_type "item | user"
        uuid item_id FK
        uuid reported_user_id FK
        text target_label
        text reason
        text details
        text status "open | in_progress | resolved | dismissed"
        text admin_note
        uuid handled_by FK
        timestamptz handled_at
    }
    EMAIL_LOG {
        uuid id PK
        text type
        uuid recipient_user_id FK
        uuid related_id
        text status "sent | failed | skipped"
        timestamptz sent_at
    }
    ADMIN_AUDIT_LOG {
        uuid id PK
        uuid admin_id FK
        text action
        text target_type
        uuid target_id
        timestamptz created_at
    }
```

טבלה נוספת, `rate_limits` (מפתח מגובב, תחילת חלון, מונה), משמשת את הגבלת הקצב ואינה קשורה לטבלאות האחרות.

פירוט השדות, הסוגים והאילוצים: [`DATA_MODEL.md`](DATA_MODEL.md).
