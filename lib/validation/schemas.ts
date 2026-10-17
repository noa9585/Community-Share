import { z } from "zod";

import { emailTypoMessage, suggestEmailFix } from "@/lib/validation/email-domain";

/**
 * The starting list of areas. The live list is managed by admins and stored in
 * the database (table `areas`); this copy only seeds demo mode.
 */
export const DEFAULT_AREAS = ["צפון", "דרום", "מרכז", "ירושלים", "שרון", "שפלה"] as const;

/** An area the user picked from the list. The database checks that it exists. */
const areaChoice = (message: string) =>
  z.string({ message }).trim().min(1, message).max(40, message);

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
  email: email.superRefine((value, context) => {
    const suggestion = suggestEmailFix(value);
    if (suggestion) context.addIssue({ code: "custom", message: emailTypoMessage(suggestion) });
  }),
  password: newPassword,
  fullName,
  residenceArea: areaChoice("יש לבחור אזור מגורים"),
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
  residenceArea: areaChoice("יש לבחור אזור מגורים"),
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
  area: areaChoice("יש לבחור אזור"),
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
  area: z.string().trim().min(1).max(40).optional().catch(undefined),
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

export const adminLoanActionSchema = z.object({ loanId: id });

export const MAX_MESSAGE_LENGTH = 2000;

export const startConversationSchema = z.object({
  itemId: id,
  memberId: id.optional(),
});

export const messageSchema = z.object({
  conversationId: id,
  body: z.string().trim().max(MAX_MESSAGE_LENGTH, "ההודעה ארוכה מדי"),
});

export const REPORT_REASONS = {
  damaged: "הפריט פגום או לא תקין",
  misleading: "התיאור או התמונות לא תואמים",
  not_returned: "פריט לא הוחזר",
  behavior: "התנהגות לא הולמת",
  other: "אחר",
} as const;

const reportReason = z.enum(
  Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS, ...(keyof typeof REPORT_REASONS)[]],
  { message: "יש לבחור סיבה" },
);

export const reportSchema = z.object({
  targetType: z.enum(["item", "user"]),
  targetId: id,
  reason: reportReason,
  details: z
    .string()
    .trim()
    .min(5, "נא לתאר את הבעיה בכמה מילים")
    .max(1000, "התיאור ארוך מדי"),
});

export const adminReportActionSchema = z.object({
  reportId: id,
  status: z.enum(["in_progress", "resolved", "dismissed"]),
  note: z.string().trim().max(1000, "ההערה ארוכה מדי"),
});

const taxonomyName = (max: number) =>
  z
    .string()
    .trim()
    .min(2, "השם חייב להכיל לפחות 2 תווים")
    .max(max, "השם ארוך מדי")
    .regex(/^[^<>\u0000-\u001f]*$/, "השם מכיל תווים לא חוקיים");

export const adminCategorySchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save"),
    id: id.optional(),
    name: taxonomyName(60),
    icon: z.string().regex(/^[a-z0-9_]{1,40}$/, "אייקון לא תקין"),
  }),
  z.object({ intent: z.literal("delete"), id }),
]);

export const adminAreaSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("save"), id: id.optional(), name: taxonomyName(40) }),
  z.object({ intent: z.literal("delete"), id }),
]);

export type ReportInput = z.infer<typeof reportSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;
