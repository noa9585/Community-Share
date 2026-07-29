import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { ItemImagePlaceholder } from "@/components/MaterialIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { TrustRing, trustScoreFromRating } from "@/components/TrustRing";
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
  return { title: item ? `${item.name} | שיתוף קהילתי` : "פריט | שיתוף קהילתי" };
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

  const images = (item.item_images ?? []).filter((img) => isValidStorageUrl(img.url));
  const mainImage = images[0];
  const trustScore = trustScoreFromRating(item.condition_rating);

  return (
    <AppNav user={user} activePath="/catalog" title="שיתוף קהילתי" showSearch>
      <nav className="mb-8 flex items-center gap-2 text-sm text-outline-variant">
        <Link href="/" className="hover:text-primary">
          בית
        </Link>
        <MaterialIcon name="chevron_left" size={16} />
        <Link href="/catalog" className="hover:text-primary">
          קטלוג
        </Link>
        {item.category?.name && (
          <>
            <MaterialIcon name="chevron_left" size={16} />
            <span>{item.category.name}</span>
          </>
        )}
        <MaterialIcon name="chevron_left" size={16} />
        <span className="font-medium text-on-surface">{item.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-secondary/15 bg-white shadow-sm">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainImage.url}
                alt={item.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <ItemImagePlaceholder categoryName={item.category?.name} className="h-full w-full" />
            )}
            <div className="absolute bottom-4 right-4 rounded-full border border-secondary/10 bg-white/90 px-3 py-1 text-sm font-bold text-brand-deep backdrop-blur">
              מצב: {item.condition_rating}/10
            </div>
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {images.slice(0, 3).map((image) => (
                <div
                  key={image.id}
                  className="aspect-square overflow-hidden rounded-xl border border-secondary/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-stack-lg lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-headline text-3xl font-semibold text-on-surface">{item.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-primary">
                  <MaterialIcon name="location_on" filled size={20} />
                  <span>{item.area}</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-1 text-primary">
                  <MaterialIcon name="person" size={20} />
                  <span>הושאל ע&quot;י {item.owner?.full_name ?? "שכן"}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <TrustRing score={trustScore} size="lg" />
              <span className="text-sm font-bold text-brand-deep">מדד אמון</span>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-2xl border border-secondary/10 bg-primary-container/30 p-6 md:flex-row">
            <div className="flex-1 space-y-2 border-l border-secondary/10 pl-6">
              <h4 className="text-sm font-bold text-brand-deep opacity-60">פיקדון (יוחזר בסיום)</h4>
              <p className="font-headline text-2xl text-brand-deep">₪{item.deposit_amount}</p>
            </div>
            <div className="flex-1 space-y-2 border-l border-secondary/10 pl-6">
              <h4 className="text-sm font-bold text-brand-deep opacity-60">זמינות</h4>
              <p className="font-headline text-2xl text-brand-deep">
                {item.available_quantity}/{item.total_quantity}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-bold text-brand-deep opacity-60">מצב פריט</h4>
              <div className="flex items-center gap-1 text-primary">
                <MaterialIcon name="star" filled />
                <span className="font-headline text-2xl">{item.condition_rating}</span>
              </div>
            </div>
          </div>

          {item.description && (
            <div className="space-y-4">
              <h3 className="font-headline text-2xl text-secondary">תיאור הפריט</h3>
              <p className="max-w-2xl leading-relaxed text-on-surface-variant">{item.description}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-headline text-2xl text-secondary">לוח תפוסות</h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-on-surface-variant">כל התאריכים פנויים כרגע</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking, index) => (
                  <div
                    key={`${booking.start_date}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-error-container/40 bg-error-container/40 px-4 py-3 text-sm text-error"
                  >
                    <span>
                      {booking.start_date} – {booking.end_date}
                    </span>
                    <span>תפוס</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {item.approval_status === "approved" && user?.status === "approved" && (
            <div className="flex flex-col items-center justify-between gap-8 rounded-3xl border border-secondary/10 bg-white p-8 shadow-sm md:flex-row">
              <div className="space-y-1">
                <p className="text-sm text-outline-variant">מוכן להשאלה בקהילה</p>
                <h3 className="font-headline text-3xl text-brand-deep">בקשת השאלה</h3>
              </div>
              <Link
                href={`/items/${item.id}/borrow`}
                className="rounded-2xl bg-brand-mint px-12 py-4 text-xl font-bold text-brand-deep shadow-[0_10px_20px_-5px_rgba(101,220,213,0.4)] transition-all hover:-translate-y-0.5 active:scale-95"
              >
                בקשת השאלה
              </Link>
            </div>
          )}

          <div className="flex gap-6 rounded-2xl bg-secondary/5 p-6">
            <MaterialIcon name="verified_user" className="text-3xl text-secondary" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-secondary">
                מדד אמון ({trustScore})
              </h4>
              <p className="text-sm text-on-surface-variant">
                מדד האמון משקף את מצב הפריט, אמינות הבעלים ואיכות ההשאלות הקודמות בקהילה.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppNav>
  );
}
