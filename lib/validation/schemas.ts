import { z } from "zod";

export const RESIDENCE_AREAS = [
  "צפון",
  "דרום",
  "מרכז",
  "ירושלים",
  "שרון",
  "שפלה",
] as const;

export const MAX_LOAN_DAYS = 90;
export const MAX_ITEM_IMAGES = 5;

/** Today's date (YYYY-MM-DD) in Israel, matching `public.today()` in the database. */
export function todayInIsrael(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "כתובת אימייל ארוכה מדי")
  .pipe(z.email("כתובת אימייל לא תקינה"));

// 72 bytes is the bcrypt limit used by the auth provider; longer input is silently cut.
const newPassword = z
  .string()
  .min(10, "סיסמה חייבת להכיל לפחות 10 תווים")
  .max(72, "סיסמה ארוכה מדי")
  .regex(/\p{L}/u, "סיסמה חייבת להכיל לפחות אות אחת")
  .regex(/\d/, "סיסמה חייבת להכיל לפחות ספרה אחת");

const fullName = z
  .string()
  .trim()
  .min(2, "שם חייב להכיל לפחות 2 תווים")
  .max(100, "שם ארוך מדי")
  .regex(/^[^<>\u0000-\u001f]*$/, "השם מכיל תווים לא חוקיים");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
  .refine((value) => !Number.isNaN(Date.parse(value)), "תאריך לא תקין");

const id = z.guid("מזהה לא תקין");

export const registerSchema = z.object({
  email,
  password: newPassword,
  fullName,
  residenceArea: z.enum(RESIDENCE_AREAS, {
    message: "יש לבחור אזור מגורים",
  }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "יש להזין סיסמה").max(72, "סיסמה ארוכה מדי"),
});

export const resetPasswordSchema = z.object({ email });

export const newPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "הסיסמאות אינן זהות",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  fullName,
  residenceArea: z.enum(RESIDENCE_AREAS, {
    message: "יש לבחור אזור מגורים",
  }),
});

export const itemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "שם פריט חייב להכיל לפחות 2 תווים")
    .max(100, "שם פריט ארוך מדי"),
  description: z
    .string()
    .trim()
    .max(2000, "תיאור ארוך מדי")
    .optional()
    .or(z.literal("")),
  categoryId: id,
  conditionRating: z.coerce
    .number()
    .int()
    .min(1, "מצב מינימלי הוא 1")
    .max(10, "מצב מקסימלי הוא 10"),
  totalQuantity: z.coerce
    .number()
    .int()
    .min(1, "כמות חייבת להיות לפחות 1")
    .max(1000, "כמות גדולה מדי"),
  depositAmount: z.coerce
    .number()
    .min(0, "פיקדון לא יכול להיות שלילי")
    .max(100_000, "סכום פיקדון גבוה מדי")
    .multipleOf(0.01, "סכום פיקדון לא תקין"),
  area: z.enum(RESIDENCE_AREAS, { message: "יש לבחור אזור" }),
});

export const borrowRequestSchema = z
  .object({
    itemId: id,
    startDate: isoDate,
    endDate: isoDate,
    requestedQuantity: z.coerce
      .number()
      .int()
      .min(1, "כמות חייבת להיות לפחות 1")
      .max(1000, "כמות גדולה מדי"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "תאריך סיום חייב להיות אחרי תאריך התחלה",
    path: ["endDate"],
  })
  .refine((data) => data.startDate >= todayInIsrael(), {
    message: "תאריך התחלה לא יכול להיות בעבר",
    path: ["startDate"],
  })
  .refine((data) => daysBetween(data.startDate, data.endDate) <= MAX_LOAN_DAYS, {
    message: `ניתן לבקש השאלה של עד ${MAX_LOAN_DAYS} יום`,
    path: ["endDate"],
  });

/** Catalog query string. Every field is optional; invalid values are dropped. */
export const catalogFiltersSchema = z.object({
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
  category: id.optional().catch(undefined),
  area: z.enum(RESIDENCE_AREAS).optional().catch(undefined),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
});

export const searchQuerySchema = z.string().trim().min(2).max(100);

export const idSchema = id;

export const adminUserActionSchema = z.object({
  userId: id,
  action: z.enum(["approve", "block", "unblock"]),
});

export const adminItemActionSchema = z.object({
  itemId: id,
  action: z.enum(["approve", "reject"]),
});

export const borrowActionSchema = z.object({
  requestId: id,
  action: z.enum(["approve", "reject", "cancel"]),
});

export const loanActionSchema = z.object({
  loanId: id,
  action: z.enum(["mark_returned", "confirm_return", "mark_deposit_received"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;
