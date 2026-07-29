"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import { createItemAction } from "@/lib/actions/items";
import { RESIDENCE_AREAS } from "@/lib/validation/schemas";
import { useEffect, useRef, useState } from "react";

export function NewItemForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useFormAction(createItemAction);
  const [trustRating, setTrustRating] = useState(7);
  const progressRef = useRef<SVGCircleElement>(null);
  const totalLength = 282.7;

  useEffect(() => {
    if (progressRef.current) {
      const offset = totalLength - totalLength * (trustRating / 10);
      progressRef.current.style.strokeDashoffset = String(offset);
    }
  }, [trustRating]);

  return (
    <form action={action} className="space-y-stack-md">
      <FormMessage state={state} />

      <div className="flat-border space-y-4 rounded-xl bg-white p-8">
        <label className="font-headline block text-xl text-brand-deep">תמונת הפריט</label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 transition-colors hover:border-brand-mint">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container transition-transform group-hover:scale-110">
            <MaterialIcon name="add_a_photo" className="text-3xl text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-brand-deep">גררו לכאן תמונה או לחצו לבחירה</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              תמונות ברורות עוזרות להגדיל את האמון בקהילה
            </p>
          </div>
          <input
            name="images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
          />
        </label>
      </div>

      <div className="flat-border space-y-6 rounded-xl bg-white p-8">
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-secondary">שם הפריט</span>
            <input
              name="name"
              required
              placeholder="לדוגמה: מקדחה נטענת בוש"
              className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-on-surface focus:ring-2 focus:ring-brand-mint"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-secondary">קטגוריה</span>
            <select
              name="categoryId"
              required
              defaultValue=""
              className="w-full appearance-none rounded-lg border-none bg-surface-container-low px-4 py-3 text-on-surface focus:ring-2 focus:ring-brand-mint"
            >
              <option value="" disabled>
                בחר קטגוריה
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-secondary">תיאור מצב הפריט</span>
          <textarea
            name="description"
            placeholder="תארו את מצב הפריט, האם יש הנחיות מיוחדות לשימוש?"
            rows={4}
            className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-on-surface focus:ring-2 focus:ring-brand-mint"
          />
        </label>
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-secondary">מצב (1-10)</span>
            <input
              name="conditionRating"
              type="number"
              min={1}
              max={10}
              defaultValue={8}
              required
              className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 focus:ring-2 focus:ring-brand-mint"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-secondary">כמות</span>
            <input
              name="totalQuantity"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 focus:ring-2 focus:ring-brand-mint"
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-secondary">אזור</span>
          <select
            name="area"
            required
            defaultValue=""
            className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 focus:ring-2 focus:ring-brand-mint"
          >
            <option value="" disabled>
              בחר אזור
            </option>
            {RESIDENCE_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
        <div className="flat-border flex flex-col items-center justify-center space-y-4 rounded-xl bg-white p-8 text-center">
          <label className="text-sm font-bold text-secondary">דירוג אמון נדרש (1-10)</label>
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="-rotate-90" viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="45" fill="transparent" stroke="#eeeeec" strokeWidth="8" />
              <circle
                ref={progressRef}
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="#65DCD5"
                strokeDasharray="282.7"
                strokeDashoffset="84.8"
                strokeWidth="8"
              />
            </svg>
            <input
              type="number"
              min={1}
              max={10}
              value={trustRating}
              onChange={(e) => setTrustRating(Number(e.target.value))}
              className="absolute w-16 border-none bg-transparent p-0 text-center font-headline text-3xl font-bold text-brand-deep focus:ring-0"
              readOnly
            />
          </div>
          <p className="text-sm text-on-surface-variant">מבוסס על מצב הפריט שהוזן</p>
        </div>
        <div className="flat-border flex flex-col justify-center space-y-4 rounded-xl bg-white p-8">
          <label className="text-sm font-bold text-secondary">סכום פיקדון (₪)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant">
              ₪
            </span>
            <input
              name="depositAmount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
              placeholder="0.00"
              className="w-full rounded-lg border-none bg-surface-container-low py-6 pl-10 pr-4 text-center font-headline text-3xl font-bold text-brand-deep focus:ring-2 focus:ring-brand-mint"
            />
          </div>
          <p className="text-center text-sm text-on-surface-variant">
            הסכום יוחזק בנאמנות דיגיטלית עד להחזרת הפריט
          </p>
        </div>
      </div>

      <div className="pt-stack-md">
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-mint py-6 font-headline text-xl font-bold text-brand-deep shadow-lg shadow-brand-mint/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          <MaterialIcon name="publish" />
          {pending ? "שולח..." : "פרסום פריט בקהילה"}
        </button>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          בלחיצה על פרסום, הינך מאשר/ת את אמנת השיתוף השכונתית
        </p>
      </div>
    </form>
  );
}
