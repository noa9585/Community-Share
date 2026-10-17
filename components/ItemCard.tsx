import Link from "next/link";

import { ItemImagePlaceholder, getCategoryIcon } from "@/components/MaterialIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { TrustRingCatalog, trustScoreFromRating } from "@/components/TrustRing";
import { firstImageUrl } from "@/lib/utils/url";
import type { Item } from "@/types/database";

/** Square thumbnail of an item, falling back to a category icon. */
export function ItemThumbnail({
  item,
  className = "",
}: {
  item?: Item | null;
  className?: string;
}) {
  const imageUrl = firstImageUrl(item);
  return (
    <div className={`shrink-0 overflow-hidden bg-surface-container ${className}`}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <ItemImagePlaceholder categoryName={item?.category?.name} className="h-full w-full" />
      )}
    </div>
  );
}

export function CatalogItemCard({ item }: { item: Item }) {
  const trustScore = trustScoreFromRating(item.condition_rating);
  const isAvailable = item.available_quantity > 0;

  return (
    <div className="item-card relative flex flex-col gap-4 rounded-xl p-4">
      <div className="absolute left-6 top-6 z-10">
        <TrustRingCatalog score={trustScore} />
      </div>
      <Link href={`/items/${item.id}`} className="block" aria-label={item.name}>
        <ItemThumbnail item={item} className="h-48 w-full rounded-lg" />
      </Link>
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/items/${item.id}`} className="min-w-0">
            <h3 className="truncate font-headline-sm text-headline-sm text-secondary">
              {item.name}
            </h3>
          </Link>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold ${
              isAvailable
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-variant text-on-surface-variant"
            }`}
          >
            {isAvailable ? "פנוי" : "בהשאלה"}
          </span>
        </div>
        <p className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
          <MaterialIcon name="location_on" size={16} />
          {item.area} · {item.owner?.full_name ?? "חבר/ת קהילה"}
        </p>
      </div>
      <Link
        href={`/items/${item.id}`}
        className="mt-auto rounded-lg bg-secondary py-2 text-center font-label-md text-label-md text-on-secondary transition-all hover:opacity-90 active:scale-95"
      >
        לפרטים ולבקשת השאלה
      </Link>
    </div>
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

export { getCategoryIcon };
