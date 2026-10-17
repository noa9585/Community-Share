/**
 * An error that is safe to show to the user. Anything else that is thrown is
 * treated as internal and replaced by a generic message, so database or
 * provider details never reach the browser.
 */
export class AppError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AppError";
  }
}

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "יש להתחבר מחדש",
  NOT_APPROVED: "החשבון אינו מאושר לביצוע הפעולה",
  FORBIDDEN: "אין לך הרשאה לבצע את הפעולה",
  NOT_FOUND: "הפריט או הבקשה לא נמצאו",
  INVALID_INPUT: "קלט לא תקין",
  INVALID_DATES: "התאריכים שנבחרו אינם תקינים (עד 90 יום, לא בעבר)",
  NOT_AVAILABLE: "הפריט אינו זמין בתאריכים או בכמות המבוקשת",
  OWN_ITEM: "לא ניתן לבקש השאלה של פריט שלך",
  DUPLICATE_REQUEST: "כבר קיימת בקשה ממתינה שלך לפריט הזה בתאריכים אלה",
  TOO_MANY_REQUESTS: "יש לך יותר מדי בקשות ממתינות. בטל/י בקשות ישנות ונסה/י שוב",
  TOO_MANY_ITEMS: "הגעת למספר המרבי של פריטים או של פריטים הממתינים לאישור",
  TOO_MANY_IMAGES: "ניתן להעלות עד 5 תמונות לפריט",
  INVALID_IMAGE: "אחת התמונות אינה תקינה. מותר JPG, PNG או WebP עד 1MB",
  NOT_PENDING: "הבקשה כבר טופלה",
  LOAN_STATE: "לא ניתן לבצע את הפעולה במצב הנוכחי של ההשאלה",
  ITEM_ON_LOAN: "לא ניתן למחוק פריט שנמצא כרגע בהשאלה",
  QUANTITY_BELOW_LOANED: "הכמות לא יכולה להיות קטנה ממספר היחידות שמושאלות כרגע",
  CANNOT_MODIFY_SELF: "לא ניתן לשנות את הסטטוס של עצמך",
  CANNOT_MODIFY_ADMIN: "לא ניתן לשנות סטטוס של אדמין",
  RATE_LIMITED: "יותר מדי ניסיונות. נסה/י שוב בעוד מספר דקות",
  REPORT_SELF: "לא ניתן לדווח על עצמך או על פריט שלך",
  TOO_MANY_REPORTS: "יש לך יותר מדי דיווחים פתוחים. נא להמתין לטיפול בהם",
  DUPLICATE_NAME: "כבר קיים פריט ברשימה בשם הזה",
  AREA_IN_USE: "לא ניתן למחוק אזור שמשתמשים או פריטים משויכים אליו. אפשר לשנות את שמו",
  CATEGORY_IN_USE: "לא ניתן למחוק קטגוריה שיש בה פריטים. אפשר לשנות את שמה",
  LAST_AREA: "חייב להישאר לפחות אזור אחד",
  LAST_CATEGORY: "חייבת להישאר לפחות קטגוריה אחת",
};

export function messageForError(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return MESSAGES[error.code] ?? fallback;
  }
  console.error("[community-share] unexpected error", error);
  return fallback;
}
