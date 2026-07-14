import type { User } from "@/types/database";

export const DEMO_USER_IDS = {
  admin: "11111111-1111-1111-1111-111111111111",
  regular: "22222222-2222-2222-2222-222222222222",
  pending: "33333333-3333-3333-3333-333333333333",
  blocked: "44444444-4444-4444-4444-444444444444",
} as const;

export type DemoUserKey = keyof typeof DEMO_USER_IDS;

export interface DemoUser extends User {
  label: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: DEMO_USER_IDS.admin,
    full_name: "מנהל קהילה",
    email: "admin@demo.com",
    residence_area: "מרכז",
    role: "admin",
    status: "approved",
    created_at: "2026-01-01T00:00:00.000Z",
    label: "אדמין",
  },
  {
    id: DEMO_USER_IDS.regular,
    full_name: "דנה כהן",
    email: "user@demo.com",
    residence_area: "שרון",
    role: "regular",
    status: "approved",
    created_at: "2026-01-02T00:00:00.000Z",
    label: "משתמש רגיל",
  },
  {
    id: DEMO_USER_IDS.pending,
    full_name: "יוסי לוי",
    email: "pending@demo.com",
    residence_area: "דרום",
    role: "regular",
    status: "pending",
    created_at: "2026-01-03T00:00:00.000Z",
    label: "ממתין לאישור",
  },
];

export const MOCK_USER_COOKIE = "mock_user_id";
