import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { LoanActions } from "@/components/ItemActions";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "ההשאלות שלי | Community Share",
};

const TABS = [
  { key: "pending", label: "ממתינות" },
  { key: "active", label: "פעילות" },
  { key: "completed", label: "הסתיימו" },
  { key: "late", label: "באיחור" },
] as const;

export default async function MyLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : "pending";
  const repo = await getRepository();
  const requests = await repo.getMyLoans(user!.id);

  const filtered = requests.filter((request) => {
    const loanStatus = request.loan?.status;
    if (tab === "pending") return request.status === "pending";
    if (tab === "active") return loanStatus === "active";
    if (tab === "completed") return loanStatus === "completed";
    if (tab === "late") return loanStatus === "late";
    return true;
  });

  return (
    <div>
      <AppNav user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">ההשאלות שלי</h1>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <a
              key={item.key}
              href={`/my-loans?tab=${item.key}`}
              className={`rounded-full px-4 py-2 text-sm ${
                tab === item.key
                  ? "bg-emerald-600 text-white"
                  : "bg-white ring-1 ring-zinc-200"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-500">אין השאלות בקטגוריה זו</p>
          )}
          {filtered.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{request.item?.name}</p>
                  <p className="text-sm text-zinc-500">
                    {request.start_date} – {request.end_date}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <StatusBadge status={request.status} />
                    {request.loan && <StatusBadge status={request.loan.status} />}
                  </div>
                </div>
                {request.loan && (
                  <LoanActions
                    loanId={request.loan.id}
                    role="requester"
                    status={request.loan.status}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
