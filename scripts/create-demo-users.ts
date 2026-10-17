/**
 * Creates the two demo accounts used in presentations: an approved regular
 * member and an approved admin. Run once, then run supabase/seed.sql.
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/create-demo-users.ts
 *
 * Required environment variables (nothing is hard-coded):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   DEMO_USER_PASSWORD, DEMO_ADMIN_PASSWORD
 * Optional: DEMO_USER_EMAIL, DEMO_ADMIN_EMAIL
 *
 * These accounts have known passwords. Block or delete them in the admin
 * panel once the presentation is over.
 */
import { createClient } from "@supabase/supabase-js";

type DemoAccount = {
  email: string;
  password: string | undefined;
  fullName: string;
  area: string;
  role: "regular" | "admin";
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const accounts: DemoAccount[] = [
  {
    email: process.env.DEMO_USER_EMAIL ?? "demo.user@example.com",
    password: requireEnv("DEMO_USER_PASSWORD"),
    fullName: "דנה כהן (דמו)",
    area: "שרון",
    role: "regular",
  },
  {
    email: process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@example.com",
    password: requireEnv("DEMO_ADMIN_PASSWORD"),
    fullName: "מנהל הקהילה (דמו)",
    area: "מרכז",
    role: "admin",
  },
];

async function findUserId(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

async function main() {
  for (const account of accounts) {
    let userId = await findUserId(account.email);

    if (userId) {
      console.log(`${account.email}: already exists, updating role and status`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName, residence_area: account.area },
      });
      if (error || !data.user) {
        throw new Error(`${account.email}: ${error?.message ?? "user was not created"}`);
      }
      userId = data.user.id;
      console.log(`${account.email}: created`);
    }

    // The sign-up trigger always starts accounts as pending regular members;
    // approval and the admin role are granted here with the service role.
    const { error } = await supabase
      .from("users")
      .update({ status: "approved", role: account.role })
      .eq("id", userId);
    if (error) throw new Error(`${account.email}: ${error.message}`);
  }

  console.log("Done. Next: run supabase/seed.sql in the SQL Editor.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
