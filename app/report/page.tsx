import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { ReportForm } from "@/components/ReportForm";
import { ReportStatusBadge } from "@/components/StatusBadge";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { REPORT_REASONS, idSchema } from "@/lib/validation/schemas";

export const metadata: Metadata = {
  title: "דיווח על בעיה | שיתוף קהילתי",
};

const CARD = "rounded-2xl border border-secondary/10 bg-white p-5 md:p-8";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string | string[]; user?: string | string[] }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;
  const repo = await getRepository();

  const itemId = idSchema.safeParse(params.item);
  const userId = idSchema.safeParse(params.user);

  // What is being reported, as the reporter is allowed to see it.
  let target: { type: "item" | "user"; id: string; label: string } | null = null;
  if (itemId.success) {
    const item = await repo.getItemById(itemId.data);
    if (item && item.owner_id !== user.id) {
      target = { type: "item", id: item.id, label: `הפריט "${item.name}"` };
    }
  } else if (userId.success && userId.data !== user.id) {
    target = { type: "user", id: userId.data, label: "חבר/ת קהילה" };
  }

  const myReports = await repo.getMyReports(user.id);

  return (
    <AppNav user={user} activePath="/report" headerTitle="דיווח על בעיה">
      <div className="mx-auto max-w-2xl space-y-stack-lg">
        <div>
          <h1 className="mb-1 font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
            דיווח על בעיה
          </h1>
          <p className="font-body-md text-on-surface-variant">
            הדיווח מגיע למנהל הקהילה בלבד. מי שדיווחת עליו לא רואה את הדיווח ולא יודע מי שלח אותו.
          </p>
        </div>

        {target ? (
          <section className={`${CARD} space-y-4`}>
            <p className="font-bold text-brand-deep">דיווח על: {target.label}</p>
            <ReportForm targetType={target.type} targetId={target.id} />
          </section>
        ) : (
          <p className={`${CARD} text-on-surface-variant`}>
            כדי לדווח, פתחו את עמוד הפריט ולחצו על &quot;דיווח על בעיה בפריט&quot;, או פתחו שיחה
            ולחצו על &quot;דיווח על המשתמש/ת&quot;.{" "}
            <Link href="/catalog" className="font-bold text-secondary underline">
              לקטלוג
            </Link>
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-headline-sm text-headline-sm text-brand-deep">הדיווחים שלי</h2>
          {myReports.length === 0 ? (
            <p className="rounded-2xl border border-secondary/10 bg-white/70 p-4 text-sm text-on-surface-variant">
              לא שלחת דיווחים
            </p>
          ) : (
            <ul className="space-y-2">
              {myReports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary/10 bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-brand-deep">{report.target_label}</p>
                    <p className="text-sm text-on-surface-variant">
                      {REPORT_REASONS[report.reason]} · {report.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <ReportStatusBadge status={report.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppNav>
  );
}
