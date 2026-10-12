import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BorrowRequestForm } from "@/components/BorrowRequestForm";
import { ItemThumbnail } from "@/components/ItemCard";
import { MaterialIcon } from "@/components/MaterialIcon";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { MAX_LOAN_DAYS, todayInIsrael } from "@/lib/validation/schemas";

export const metadata: Metadata = {
  title: "בקשת השאלה | שיתוף קהילתי",
};

export default async function BorrowRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser();

  const repo = await getRepository();
  const [item, bookings] = await Promise.all([
    repo.getItemById(id),
    repo.getItemBookings(id),
  ]);

  if (!item || item.approval_status !== "approved") notFound();
  if (item.owner_id === user.id) redirect(`/items/${item.id}`);

  const today = todayInIsrael();

  return (
    <AppNav user={user} activePath="/catalog" headerTitle="בקשת השאלה">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/items/${item.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline"
        >
          <MaterialIcon name="chevron_right" size={18} />
          חזרה לפריט
        </Link>

        <div className="grid grid-cols-1 gap-6 rounded-xl border border-secondary/15 bg-surface p-5 md:grid-cols-2 md:p-8">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <ItemThumbnail item={item} className="h-20 w-20 rounded-lg" />
              <div className="min-w-0">
                <h1 className="break-words font-headline-sm text-headline-sm text-on-background">
                  {item.name}
                </h1>
                <p className="text-sm text-secondary">
                  {item.owner?.full_name ?? "חבר/ת קהילה"} · {item.area}
                </p>
                <p className="text-sm text-on-surface-variant">
                  פיקדון: {item.deposit_amount > 0 ? `₪${item.deposit_amount}` : "ללא"}
                </p>
              </div>
            </div>
            <AvailabilityCalendar
              bookings={bookings}
              totalQuantity={item.total_quantity}
              today={today}
            />
          </div>

          <div>
            <h2 className="mb-1 font-headline-sm text-headline-sm text-secondary">בקשת השאלה</h2>
            <p className="mb-6 text-sm text-on-surface-variant">
              בחר/י תאריכים פנויים וכמות, ושלח/י את הבקשה לבעלים.
            </p>
            <BorrowRequestForm
              itemId={item.id}
              totalQuantity={item.total_quantity}
              today={today}
              maxLoanDays={MAX_LOAN_DAYS}
            />
          </div>
        </div>
      </div>
    </AppNav>
  );
}
