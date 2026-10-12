"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser, requireApprovedUser } from "@/lib/auth/session";
import { getSiteUrl, isMockMode } from "@/lib/config";
import { getRepository } from "@/lib/data/index";
import { messageForError } from "@/lib/errors";
import { clearMockUserCookie, setMockUserCookie } from "@/lib/mock/auth";
import { DEMO_USERS } from "@/lib/mock/users";
import { enforceRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/url";
import {
  loginSchema,
  newPasswordSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/schemas";

export type ActionResult = {
  error?: string;
  success?: string;
};

const RATE_LIMIT_MESSAGE = "יותר מדי ניסיונות. נסה/י שוב בעוד מספר דקות";

export async function demoLoginAction(userId: string) {
  if (!isMockMode()) {
    redirect("/login");
  }
  const user = DEMO_USERS.find((demoUser) => demoUser.id === userId);
  if (!user) {
    redirect("/login?error=invalid");
  }
  await setMockUserCookie(user.id);
  if (user.status === "pending") redirect("/pending-approval");
  if (user.status === "blocked") redirect("/blocked");
  redirect("/");
}

export async function registerAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (isMockMode()) {
    return { success: "במצב דמו – השתמש/י בכפתורי ההתחברות למטה" };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    residenceArea: formData.get("residenceArea"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("registerPerIp", await getClientIp());
  } catch {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        residence_area: parsed.data.residenceArea,
      },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { error: "הסיסמה חלשה מדי או מופיעה ברשימת סיסמאות שדלפו. בחר/י סיסמה אחרת" };
    }
    // An address that is already registered must look exactly like a new one,
    // otherwise this form tells an attacker who is a member.
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      console.error("[community-share] sign-up failed", error.code);
      return { error: "לא ניתן להשלים את ההרשמה כרגע. נסה/י שוב מאוחר יותר" };
    }
  }

  if (data.session) {
    redirect("/pending-approval");
  }

  return {
    success:
      "כמעט סיימנו! שלחנו אליך אימייל לאימות הכתובת. לאחר האימות, אדמין הקהילה יאשר את החשבון.",
  };
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (isMockMode()) {
    return { error: "במצב דמו – בחר/י משתמש מהרשימה למטה" };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  // Two budgets: one per address (slows guessing a single account from many
  // machines) and one per client (slows trying many accounts from one machine).
  try {
    await enforceRateLimit("loginPerIp", await getClientIp());
    await enforceRateLimit("loginPerEmail", parsed.data.email);
  } catch {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "יש לאמת את כתובת האימייל דרך הקישור שנשלח אליך לפני ההתחברות" };
    }
    // Same message for a wrong password and an unknown address.
    return { error: "אימייל או סיסמה שגויים" };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function logoutAction() {
  if (isMockMode()) {
    await clearMockUserCookie();
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (isMockMode()) {
    return { success: "במצב דמו – איפוס סיסמה לא זמין" };
  }

  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("passwordResetPerIp", await getClientIp());
    await enforceRateLimit("passwordResetPerEmail", parsed.data.email);
  } catch {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("[community-share] password reset failed", error.code);
  }

  // Always the same answer, whether or not the address belongs to a member.
  return {
    success: "אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס הסיסמה. יש לפתוח אותו באותו דפדפן.",
  };
}

/** Sets a new password for the signed-in user (after a reset link, or from the profile page). */
export async function updatePasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (isMockMode()) {
    return { error: "במצב דמו – שינוי סיסמה לא זמין" };
  }

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "הקישור פג תוקף. בקש/י קישור חדש לאיפוס הסיסמה" };
  }

  try {
    await enforceRateLimit("passwordChange", user.id);
  } catch {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "weak_password") {
      return { error: "הסיסמה חלשה מדי או מופיעה ברשימת סיסמאות שדלפו. בחר/י סיסמה אחרת" };
    }
    if (error.code === "same_password") {
      return { error: "הסיסמה החדשה חייבת להיות שונה מהקודמת" };
    }
    console.error("[community-share] password update failed", error.code);
    return { error: "לא ניתן לעדכן את הסיסמה כרגע" };
  }

  // Whoever knew the old password is signed out everywhere else.
  await supabase.auth.signOut({ scope: "others" });

  return { success: "הסיסמה עודכנה בהצלחה" };
}

export async function updateProfileAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    residenceArea: formData.get("residenceArea"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", user.id);
    const repo = await getRepository();
    await repo.updateProfile(user.id, parsed.data);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לעדכן את הפרופיל כרגע") };
  }

  revalidatePath("/", "layout");
  return { success: "הפרופיל עודכן" };
}

export async function refreshProfileAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "approved") redirect("/");
  if (user.status === "blocked") redirect("/blocked");
  revalidatePath("/pending-approval");
}
