import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { isValidStorageUrl } from "@/lib/utils/url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const repo = await getRepository();
  const item = await repo.getItemById(id);
  return { title: item ? `${item.name} | Community Share` : "פריט | Community Share" };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const repo = await getRepository();

  const [item, bookings] = await Promise.all([
    repo.getItemById(id),
    repo.getItemBookings(id),
  ]);

  if (!item) notFound();

  return (
    <div>
      <AppNav user={user} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {(item.item_images ?? []).map((image) =>
              isValidStorageUrl(image.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={item.name}
                  className="w-full rounded-2xl object-cover"
                />
              ) : null,
            )}
            {(item.item_images ?? []).length === 0 && (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                אין תמונות
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl font-bold">{item.name}</h1>
              <StatusBadge status={item.approval_status} />
            </div>
            <p className="text-zinc-600">{item.description}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">קטגוריה</dt>
                <dd>{item.category?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">מצב</dt>
                <dd>{item.condition_rating}/10</dd>
              </div>
              <div>
                <dt className="text-zinc-500">אזור</dt>
                <dd>{item.area}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">פיקדון</dt>
                <dd>{item.deposit_amount} ₪</dd>
              </div>
              <div>
                <dt className="text-zinc-500">זמינות</dt>
                <dd>
                  {item.available_quantity}/{item.total_quantity}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">בעלים</dt>
                <dd>{item.owner?.full_name}</dd>
              </div>
            </dl>

            {item.approval_status === "approved" && user?.status === "approved" && (
              <Link
                href={`/items/${item.id}/borrow`}
                className="inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white"
              >
                בקש השאלה
              </Link>
            )}
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="mb-4 text-xl font-semibold">לוח תפוסות</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-zinc-500">אין השאלות פעילות כרגע</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking, index) => (
                <div
                  key={`${booking.start_date}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm"
                >
                  <span>
                    {booking.start_date} – {booking.end_date}
                  </span>
                  <span>{booking.requested_quantity} יחידות</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
