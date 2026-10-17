import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { AdminItemActions, DeleteItemButton, OpenChatButton } from "@/components/ItemActions";
import { ItemImagePlaceholder, MaterialIcon } from "@/components/MaterialIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { TrustRingLarge, trustScoreFromRating } from "@/components/TrustRing";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { isValidStorageUrl } from "@/lib/utils/url";
import { todayInIsrael } from "@/lib/validation/schemas";

export const metadata: Metadata = {
  title: "פריט | שיתוף קהילתי",
};

export default async function ItemPage({
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

  const isOwner = item?.owner_id === user.id;
  const isAdmin = user.role === "admin";

  // An item that is not published exists only for its owner and for admins.
  if (!item || (item.approval_status !== "approved" && !isOwner && !isAdmin)) {
    notFound();
  }

  const images = (item.item_images ?? []).filter((image) => isValidStorageUrl(image.url));
  const [mainImage, ...otherImages] = images;
  const trustScore = trustScoreFromRating(item.condition_rating);
  const canBorrow = item.approval_status === "approved" && !isOwner;

  return (
    <AppNav user={user} activePath="/catalog" headerTitle="קטלוג">
      <nav
        aria-label="מיקום באתר"
        className="mb-6 flex flex-wrap items-center gap-1 font-label-md text-label-md text-on-surface-variant"
      >
        <Link href="/" className="hover:text-primary">
          בית
        </Link>
        <MaterialIcon name="chevron_left" size={16} />
        <Link href="/catalog" className="hover:text-primary">
          קטלוג
        </Link>
        {item.category && (
          <>
            <MaterialIcon name="chevron_left" size={16} />
            <Link href={`/catalog?category=${item.category.id}`} className="hover:text-primary">
              {item.category.name}
            </Link>
          </>
        )}
      </nav>

      {item.approval_status !== "approved" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tertiary/20 bg-tertiary-container p-4">
          <p className="flex items-center gap-2 text-on-tertiary-fixed-variant">
            <MaterialIcon name="info" />
            {item.approval_status === "pending"
              ? "הפריט ממתין לאישור אדמין ואינו מופיע בקטלוג."
              : "הפריט נדחה על ידי אדמין ואינו מופיע בקטלוג. ניתן לערוך ולשלוח שוב."}
          </p>
          {isAdmin && <AdminItemActions itemId={item.id} status={item.approval_status} />}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-secondary/15 bg-white">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage.url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <ItemImagePlaceholder categoryName={item.category?.name} className="h-full w-full" />
            )}
            <div className="absolute bottom-3 right-3 rounded-full border border-secondary/10 bg-white/90 px-3 py-1 text-label-md font-bold text-brand-deep">
              מצב: {item.condition_rating}/10
            </div>
          </div>
          {otherImages.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {otherImages.map((image) => (
                <div
                  key={image.id}
                  className="aspect-square overflow-hidden rounded-xl border border-secondary/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h1 className="break-words font-headline-md text-headline-md-mobile text-on-surface md:text-headline-md">
                {item.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label-md text-primary">
                <span className="flex items-center gap-1">
                  <MaterialIcon name="location_on" filled size={20} />
                  {item.area}
                </span>
                <span className="flex items-center gap-1">
                  <MaterialIcon name="person" size={20} />
                  {isOwner ? "פריט שלך" : (item.owner?.full_name ?? "חבר/ת קהילה")}
                </span>
                {isOwner && <StatusBadge status={item.approval_status} />}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <TrustRingLarge score={trustScore} />
              <span className="text-label-md font-bold text-brand-deep">מצב הפריט</span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-secondary/10 bg-white/70 p-5">
            <div>
              <dt className="font-label-md text-label-md text-on-surface-variant">
                פיקדון (מוחזר בסיום)
              </dt>
              <dd className="font-headline-sm text-headline-sm text-brand-deep">
                {item.deposit_amount > 0 ? `₪${item.deposit_amount}` : "ללא"}
              </dd>
            </div>
            <div>
              <dt className="font-label-md text-label-md text-on-surface-variant">כמות</dt>
              <dd className="font-headline-sm text-headline-sm text-brand-deep">
                {item.available_quantity} פנויים מתוך {item.total_quantity}
              </dd>
            </div>
          </dl>

          {item.description && (
            <div className="space-y-2">
              <h2 className="font-headline-sm text-headline-sm text-secondary">תיאור הפריט</h2>
              <p className="whitespace-pre-line break-words font-body-md leading-relaxed text-on-surface-variant">
                {item.description}
              </p>
            </div>
          )}

          <AvailabilityCalendar
            bookings={bookings}
            totalQuantity={item.total_quantity}
            today={todayInIsrael()}
          />

          {canBorrow && (
            <Link
              href={`/items/${item.id}/borrow`}
              className="rounded-2xl bg-brand-mint px-8 py-4 text-center font-headline-sm text-headline-sm font-bold text-brand-deep shadow-lg shadow-brand-mint/30 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              בקשת השאלה
            </Link>
          )}

          {canBorrow && (
            <div className="space-y-3">
              <OpenChatButton itemId={item.id} label="שאלה לבעל/ת הפריט" variant="block" />
              <Link
                href={`/report?item=${item.id}`}
                className="flex items-center justify-center gap-1 text-sm text-on-surface-variant underline hover:text-error"
              >
                <MaterialIcon name="flag" size={18} />
                דיווח על בעיה בפריט
              </Link>
            </div>
          )}

          {isOwner && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-secondary/10 bg-white/70 p-4">
              <Link
                href={`/items/${item.id}/edit`}
                className="rounded-lg border border-secondary/40 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/5"
              >
                עריכת הפריט
              </Link>
              <DeleteItemButton itemId={item.id} />
            </div>
          )}
        </div>
      </div>
    </AppNav>
  );
}
