import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { ItemCard } from "@/components/ItemCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    redirect(user ? "/pending-approval" : "/login");
  }

  const repo = await getRepository();
  const { categories, recentItems, myLoans, pendingRequests } =
    await repo.getHomeDashboard(user.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav user={user} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="rounded-3xl bg-emerald-600 px-6 py-10 text-white">
          <h1 className="text-3xl font-bold">שיתוף ציוד קהילתי</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">
            חפשו, השאילו ונהלו ציוד בתוך הקהילה שלכם – בפשטות ובבטחה.
          </p>
          <form action="/catalog" className="mt-6 flex gap-2">
            <input
              name="q"
              placeholder="חיפוש פריט..."
              className="flex-1 rounded-xl border-0 px-4 py-3 text-zinc-900"
            />
            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 font-medium text-emerald-700"
            >
              חפש
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">קטגוריות</h2>
            <Link href="/catalog" className="text-sm text-emerald-700">
              לכל הקטלוג
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.id}`}
                className="rounded-full bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-zinc-200"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">פריטים אחרונים</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">ההשאלות שלי</h2>
              <Link href="/my-loans" className="text-sm text-emerald-700">
                הכל
              </Link>
            </div>
            <div className="space-y-3">
              {myLoans.length === 0 && (
                <p className="text-sm text-zinc-500">אין השאלות פעילות</p>
              )}
              {myLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between text-sm">
                  <span>{loan.item?.name}</span>
                  <StatusBadge status={loan.loan?.status ?? loan.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">בקשות ממתינות לאישור</h2>
              <Link href="/my-items" className="text-sm text-emerald-700">
                הפריטים שלי
              </Link>
            </div>
            <div className="space-y-3">
              {pendingRequests.length === 0 && (
                <p className="text-sm text-zinc-500">אין בקשות ממתינות</p>
              )}
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between text-sm">
                  <span>{request.item?.name}</span>
                  <StatusBadge status="pending" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
