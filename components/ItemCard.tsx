import Link from "next/link";

import { ItemImagePlaceholder } from "@/components/MaterialIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AvailabilityBadge } from "@/components/StatusBadge";
import { TrustRing, trustScoreFromRating } from "@/components/TrustRing";
import { isValidStorageUrl } from "@/lib/utils/url";
import type { Item } from "@/types/database";

export function ItemCard({
  item,
  variant = "grid",
}: {
  item: Item;
  variant?: "grid" | "catalog";
}) {
  const imageUrl = item.item_images?.[0]?.url;
  const safeImage = imageUrl && isValidStorageUrl(imageUrl) ? imageUrl : null;
  const trustScore = trustScoreFromRating(item.condition_rating);
  const isAvailable = item.available_quantity > 0;

  if (variant === "catalog") {
    return (
      <div className="item-card relative flex flex-col gap-4 rounded-xl p-4">
        <div className="absolute left-6 top-6 z-10">
          <TrustRing score={trustScore} size="sm" innerBg="#faf9f7" />
        </div>
        <Link href={`/items/${item.id}`} className="block">
          <div className="h-48 w-full overflow-hidden rounded-lg bg-surface-container">
            {safeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeImage} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <ItemImagePlaceholder
                categoryName={item.category?.name}
                className="h-full w-full"
              />
            )}
          </div>
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/items/${item.id}`}
              className="font-headline text-lg font-semibold text-secondary hover:text-brand-deep"
            >
              {item.name}
            </Link>
            <AvailabilityBadge available={item.available_quantity} total={item.total_quantity} />
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <div className="h-5 w-5 rounded-full bg-secondary-container" />
            <span>הושאל ע&quot;י {item.owner?.full_name ?? "שכן"}</span>
          </div>
        </div>
        {isAvailable ? (
          <Link
            href={`/items/${item.id}/borrow`}
            className="mt-2 rounded-lg bg-secondary py-2 text-center text-sm font-medium text-on-secondary transition-all hover:opacity-90 active:scale-95"
          >
            בקשת השאלה
          </Link>
        ) : (
          <Link
            href={`/items/${item.id}`}
            className="mt-2 rounded-lg border border-secondary py-2 text-center text-sm font-medium text-secondary transition-all hover:bg-secondary/5 active:scale-95"
          >
            צפייה בפרטים
          </Link>
        )}
      </div>
    );
  }

  return (
    <Link
      href={`/items/${item.id}`}
      className="group relative overflow-hidden rounded-2xl border border-brand-deep/10 bg-primary-container p-5 transition-all hover:bg-[#d9fff4]"
    >
      <div className="absolute left-4 top-4">
        <TrustRing score={trustScore} size="sm" innerBg="#d9fff4" />
      </div>
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
          {safeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={safeImage}
              alt={item.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <ItemImagePlaceholder categoryName={item.category?.name} className="h-full w-full" />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-14">
          {item.category?.name && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              {item.category.name}
            </span>
          )}
          <h4 className="font-headline text-lg font-semibold text-brand-deep">{item.name}</h4>
          <p className="text-sm text-secondary/70">{item.area}</p>
        </div>
      </div>
    </Link>
  );
}

export function CategoryButton({
  name,
  icon,
  href,
}: {
  name: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-[100px] flex-col items-center gap-2 rounded-2xl border border-secondary/10 bg-white/60 p-4 transition-all hover:-translate-y-0.5 hover:bg-white"
    >
      <MaterialIcon name={icon} className="text-3xl text-secondary" />
      <span className="text-sm font-bold">{name}</span>
    </Link>
  );
}
