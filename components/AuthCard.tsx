import { MaterialIcon } from "@/components/MaterialIcon";

export const AUTH_INPUT =
  "w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-4 py-3 focus:ring-2 focus:ring-brand-mint";
export const AUTH_BUTTON =
  "w-full rounded-xl bg-brand-mint py-3 font-bold text-brand-deep transition-all hover:opacity-90 disabled:opacity-60";
export const AUTH_LABEL = "mb-1 block text-sm font-medium text-secondary";

/** Shared frame for the signed-out screens (login, register, password reset...). */
export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-container p-margin-mobile md:p-gutter">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-secondary/15 bg-white shadow-sm">
        <div className="bg-secondary px-6 py-6 text-center text-on-secondary">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-mint bg-primary-container">
            <MaterialIcon name="groups" className="text-secondary" size={30} />
          </div>
          <p className="font-headline text-xl font-bold">שיתוף קהילתי</p>
          <p className="mt-1 text-sm opacity-80">השאלת ציוד בין חברי הקהילה</p>
        </div>
        <div className="p-6">
          <h1 className="font-headline mb-4 text-xl font-semibold text-brand-deep">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
