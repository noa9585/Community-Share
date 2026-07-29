"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { ItemImagePlaceholder } from "@/components/MaterialIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { TrustRing, trustScoreFromRating } from "@/components/TrustRing";
import { createBorrowRequestAction } from "@/lib/actions/borrow";
import { isValidStorageUrl } from "@/lib/utils/url";
import type { ItemWithRelations } from "@/types/database";

export function BorrowRequestForm({ item }: { item: ItemWithRelations }) {
  const [state, action, pending] = useFormAction(createBorrowRequestAction);
  const [quantity, setQuantity] = useState(1);
  const imageUrl = item.item_images?.[0]?.url;
  const safeImage = imageUrl && isValidStorageUrl(imageUrl) ? imageUrl : null;
  const trustScore = trustScoreFromRating(item.condition_rating);

  return (
    <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-secondary/15 bg-surface md:flex-row">
      <div className="border-l border-secondary/5 bg-surface-container-low p-8 md:w-5/12">
        <div className="relative mb-6">
          <div className="aspect-square overflow-hidden rounded-lg border border-secondary/10 bg-white shadow-sm">
            {safeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeImage} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <ItemImagePlaceholder categoryName={item.category?.name} className="h-full w-full" />
            )}
          </div>
          <div className="absolute -left-3 -top-3 rounded-full bg-white p-1 shadow-md">
            <TrustRing score={trustScore} size="md" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-headline text-xl text-on-background">{item.name}</h3>
            <p className="font-medium text-secondary">בעלים: {item.owner?.full_name}</p>
          </div>
          <div className="border-t border-outline-variant/30 pt-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              סיכום תנאים
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MaterialIcon name="verified_user" className="text-primary" size={20} />
                <div>
                  <p className="text-sm font-bold">פיקדון: ₪{item.deposit_amount}</p>
                  <p className="text-xs text-on-surface-variant">יוחזר במלואו עם החזרת הפריט</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon name="inventory" className="text-primary" size={20} />
                <div>
                  <p className="text-sm font-bold">זמינות</p>
                  <p className="text-xs text-on-surface-variant">
                    {item.available_quantity} מתוך {item.total_quantity} יחידות
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col p-8 md:w-7/12">
        <div className="mb-8">
          <h2 className="font-headline text-3xl text-secondary">בקשת השאלה</h2>
          <p className="text-on-surface-variant">מלא את הפרטים כדי לשלוח בקשה לבעלים</p>
        </div>
        <form action={action} className="flex flex-grow flex-col space-y-6">
          <input type="hidden" name="itemId" value={item.id} />
          <FormMessage state={state} />
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-sm text-on-surface-variant">תאריך התחלה</span>
              <div className="relative">
                <input
                  name="startDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-outline-variant/50 bg-white p-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                />
                <MaterialIcon
                  name="calendar_today"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  size={20}
                />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-on-surface-variant">תאריך סיום</span>
              <div className="relative">
                <input
                  name="endDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-outline-variant/50 bg-white p-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                />
                <MaterialIcon
                  name="event"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  size={20}
                />
              </div>
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-on-surface-variant">כמות</span>
            <div className="flex w-fit items-center rounded-lg border border-outline-variant/50 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 text-secondary transition-colors hover:bg-surface-container-low"
              >
                <MaterialIcon name="remove" />
              </button>
              <input
                name="requestedQuantity"
                type="number"
                min={1}
                max={item.available_quantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-12 border-none bg-transparent text-center font-bold focus:ring-0"
              />
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(item.available_quantity, q + 1))
                }
                className="p-3 text-secondary transition-colors hover:bg-surface-container-low"
              >
                <MaterialIcon name="add" />
              </button>
            </div>
          </label>
          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-mint py-4 font-bold text-brand-deep shadow-lg shadow-brand-mint/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <span>{pending ? "שולח..." : "שלח בקשה"}</span>
              <MaterialIcon name="send" />
            </button>
            <p className="mt-4 text-center text-xs text-on-surface-variant">
              בלחיצה על &apos;שלח בקשה&apos;, הנך מסכים לתנאי השימוש בקהילה
            </p>
          </div>
        </form>
      </div>

      <Link
        href={`/items/${item.id}`}
        className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-secondary/10 bg-white/80 text-on-surface-variant backdrop-blur-sm transition-colors hover:text-error"
        aria-label="סגור"
      >
        <MaterialIcon name="close" />
      </Link>
    </div>
  );
}
