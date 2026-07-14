"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isMockMode } from "@/lib/config";
import { getRepository } from "@/lib/data/index";
import { clearMockUserCookie, setMockUserCookie } from "@/lib/mock/auth";
import { DEMO_USERS } from "@/lib/mock/users";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/schemas";

export type ActionResult = {
  error?: string;
  success?: string;
};

export async function demoLoginAction(userId: string) {
  if (!isMockMode()) {
    redirect("/login");
  }
  const user = DEMO_USERS.find((demoUser) => demoUser.id === userId);
  if (!user) {
    redirect("/login?error=invalid");
  }
  await setMockUserCookie(userId);
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        residence_area: parsed.data.residenceArea,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/pending-approval");
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "אימייל או סיסמה שגויים" };
  }

  redirect("/");
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/login`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "נשלח קישור לאיפוס סיסמה לאימייל שלך" };
}

export async function refreshProfileAction() {
  revalidatePath("/pending-approval");
  revalidatePath("/");
}
