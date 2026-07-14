import { z } from "zod";

export const RESIDENCE_AREAS = [
  "צפון",
  "דרום",
  "מרכז",
  "ירושלים",
  "שרון",
  "שפלה",
] as const;

export const registerSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(8, "סיסמה חייבת להכיל לפחות 8 תווים"),
  fullName: z
    .string()
    .trim()
    .min(2, "שם חייב להכיל לפחות 2 תווים")
    .max(100, "שם ארוך מדי"),
  residenceArea: z.enum(RESIDENCE_AREAS, {
    message: "יש לבחור אזור מגורים",
  }),
});

export const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "יש להזין סיסמה"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
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
  categoryId: z.string().uuid("קטגוריה לא תקינה"),
  conditionRating: z.coerce
    .number()
    .int()
    .min(1, "מצב מינימלי הוא 1")
    .max(10, "מצב מקסימלי הוא 10"),
  totalQuantity: z.coerce
    .number()
    .int()
    .min(1, "כמות חייבת להיות לפחות 1"),
  depositAmount: z.coerce.number().min(0, "פיקדון לא יכול להיות שלילי"),
  area: z.enum(RESIDENCE_AREAS, { message: "יש לבחור אזור" }),
});

export const borrowRequestSchema = z
  .object({
    itemId: z.string().uuid("פריט לא תקין"),
    startDate: z.string().min(1, "יש לבחור תאריך התחלה"),
    endDate: z.string().min(1, "יש לבחור תאריך סיום"),
    requestedQuantity: z.coerce
      .number()
      .int()
      .min(1, "כמות חייבת להיות לפחות 1"),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    { message: "תאריך סיום חייב להיות אחרי תאריך התחלה", path: ["endDate"] },
  )
  .refine(
    (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(data.startDate) >= today;
    },
    { message: "תאריך התחלה לא יכול להיות בעבר", path: ["startDate"] },
  );

export const adminUserActionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["approve", "block", "unblock"]),
});

export const adminItemActionSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export const borrowActionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export const loanActionSchema = z.object({
  loanId: z.string().uuid(),
  action: z.enum(["mark_returned", "confirm_return", "mark_deposit_received"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;
