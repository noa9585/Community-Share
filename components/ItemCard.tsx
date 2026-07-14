import Link from "next/link";

import type { Item } from "@/types/database";
import { StatusBadge } from "@/components/StatusBadge";
import { isValidStorageUrl } from "@/lib/utils/url";

export function ItemCard({ item }: { item: Item }) {
  const imageUrl = item.item_images?.[0]?.url;
  const safeImage = imageUrl && isValidStorageUrl(imageUrl) ? imageUrl : null;

  return (
    <Link
      href={`/items/${item.id}`}
      className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[4/3] bg-zinc-100">
        {safeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeImage} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">אין תמונה</div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">{item.name}</h3>
          <StatusBadge status={item.approval_status} />
        </div>
        <p className="line-clamp-2 text-sm text-zinc-600">{item.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span>{item.area}</span>
          <span>מצב {item.condition_rating}/10</span>
          <span>זמין {item.available_quantity}/{item.total_quantity}</span>
        </div>
      </div>
    </Link>
  );
}
