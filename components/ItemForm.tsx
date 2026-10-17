"use client";

import { useEffect, useState } from "react";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import { createItemAction, updateItemAction } from "@/lib/actions/items";
import { compressImage } from "@/lib/utils/compress-image";
import { MAX_ITEM_IMAGES } from "@/lib/validation/schemas";

const RING_LENGTH = 282.7;

const FIELD_CLASS =
  "font-body-md w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-on-surface transition-all focus:ring-2 focus:ring-trust-mint";
const LABEL_CLASS = "block font-label-md text-label-md font-bold text-secondary";

type ExistingImage = { id: string; url: string };
type NewImage = { file: File; preview: string };

export type ItemFormValues = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  conditionRating: number;
  totalQuantity: number;
  depositAmount: number;
  area: string;
  images: ExistingImage[];
};

export function ItemForm({
  categories,
  areas,
  item,
}: {
  categories: { id: string; name: string }[];
  areas: string[];
  item?: ItemFormValues;
}) {
  const isEdit = Boolean(item);
  // Keep the item's current area selectable even if it is no longer listed.
  const areaOptions = item?.area && !areas.includes(item.area) ? [item.area, ...areas] : areas;
  const [state, action, pending] = useFormAction(isEdit ? updateItemAction : createItemAction);
  const [rating, setRating] = useState(item?.conditionRating ?? 8);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const keptExisting = (item?.images ?? []).filter((image) => !removedIds.includes(image.id));
  const remainingSlots = MAX_ITEM_IMAGES - keptExisting.length - newImages.length;

  useEffect(() => {
    return () => newImages.forEach((image) => URL.revokeObjectURL(image.preview));
    // Previews are only released when the form goes away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setImageError(null);
    setProcessing(true);

    const accepted: NewImage[] = [];
    let failed = false;
    for (const file of Array.from(fileList).slice(0, Math.max(0, remainingSlots))) {
      const compressed = await compressImage(file);
      if (compressed) {
        accepted.push({ file: compressed, preview: URL.createObjectURL(compressed) });
      } else {
        failed = true;
      }
    }

    setNewImages((current) => [...current, ...accepted]);
    if (failed) setImageError("חלק מהקבצים אינם תמונות תקינות ולא נוספו");
    else if (fileList.length > remainingSlots) {
      setImageError(`ניתן להעלות עד ${MAX_ITEM_IMAGES} תמונות לפריט`);
    }
    setProcessing(false);
  }

  function removeNewImage(preview: string) {
    URL.revokeObjectURL(preview);
    setNewImages((current) => current.filter((image) => image.preview !== preview));
  }

  function submit(formData: FormData) {
    // The file picker itself is not submitted; only the shrunken copies are.
    formData.delete("images");
    newImages.forEach((image) => formData.append("images", image.file));
    return action(formData);
  }

  const safeRating = Math.min(10, Math.max(1, rating || 1));

  return (
    <form action={submit} className="space-y-stack-md">
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {removedIds.map((id) => (
        <input key={id} type="hidden" name="removeImageIds" value={id} />
      ))}

      <div className="flat-border space-y-4 rounded-xl bg-white p-5 md:p-8">
        <p className="font-headline-sm text-headline-sm text-brand-deep">תמונות הפריט</p>

        {(keptExisting.length > 0 || newImages.length > 0) && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {keptExisting.map((image) => (
              <li key={image.id} className="relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setRemovedIds((current) => [...current, image.id])}
                  aria-label="הסר תמונה"
                  className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-error shadow"
                >
                  <MaterialIcon name="close" size={18} />
                </button>
              </li>
            ))}
            {newImages.map((image) => (
              <li
                key={image.preview}
                className="relative aspect-square overflow-hidden rounded-lg ring-2 ring-trust-mint"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(image.preview)}
                  aria-label="הסר תמונה"
                  className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-error shadow"
                >
                  <MaterialIcon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {remainingSlots > 0 && (
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-8 transition-colors hover:border-trust-mint">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container transition-transform group-hover:scale-110">
              <MaterialIcon name="add_a_photo" className="text-3xl text-primary" />
            </div>
            <div className="text-center">
              <p className="font-label-md text-label-md font-bold text-brand-deep">
                {processing ? "מעבד תמונות..." : "לחצו לבחירת תמונות"}
              </p>
              <p className="mt-1 font-label-md text-label-md text-on-surface-variant">
                עד {MAX_ITEM_IMAGES} תמונות (JPG, PNG או WebP). התמונות מוקטנות אוטומטית.
              </p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={processing}
              className="sr-only"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {imageError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{imageError}</p>
        )}
        {isEdit && (
          <p className="text-sm text-on-surface-variant">
            שינוי שם, תיאור, קטגוריה או הוספת תמונה מחזירים את הפריט לאישור אדמין.
          </p>
        )}
      </div>

      <div className="flat-border space-y-6 rounded-xl bg-white p-5 md:p-8">
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="item-name" className={LABEL_CLASS}>
              שם הפריט
            </label>
            <input
              id="item-name"
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={item?.name}
              placeholder="לדוגמה: מקדחה נטענת בוש"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-category" className={LABEL_CLASS}>
              קטגוריה
            </label>
            <select
              id="item-category"
              name="categoryId"
              required
              defaultValue={item?.categoryId ?? ""}
              className={FIELD_CLASS}
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
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="item-description" className={LABEL_CLASS}>
            תיאור הפריט
          </label>
          <textarea
            id="item-description"
            name="description"
            maxLength={2000}
            defaultValue={item?.description}
            placeholder="תארו את מצב הפריט, האם יש הנחיות מיוחדות לשימוש?"
            rows={4}
            className={FIELD_CLASS}
          />
        </div>
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="item-condition" className={LABEL_CLASS}>
              מצב (1-10)
            </label>
            <input
              id="item-condition"
              name="conditionRating"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              defaultValue={item?.conditionRating ?? 8}
              required
              onChange={(event) => setRating(Number(event.target.value))}
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-quantity" className={LABEL_CLASS}>
              כמות
            </label>
            <input
              id="item-quantity"
              name="totalQuantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              defaultValue={item?.totalQuantity ?? 1}
              required
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-area" className={LABEL_CLASS}>
              אזור
            </label>
            <select
              id="item-area"
              name="area"
              required
              defaultValue={item?.area ?? ""}
              className={FIELD_CLASS}
            >
              <option value="" disabled>
                בחר אזור
              </option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
        <div className="flat-border flex flex-col items-center justify-center space-y-3 rounded-xl bg-white p-6 text-center">
          <p className={LABEL_CLASS}>מצב הפריט</p>
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="trust-ring-canvas h-full w-full" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="45" fill="transparent" stroke="#eeeeec" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="#65DCD5"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH - RING_LENGTH * (safeRating / 10)}
                strokeWidth="8"
              />
            </svg>
            <span className="absolute font-headline-md text-headline-md font-bold text-brand-deep">
              {safeRating}
            </span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant">
            מבוסס על המצב שהוזן
          </p>
        </div>
        <div className="flat-border flex flex-col justify-center space-y-3 rounded-xl bg-white p-6">
          <label htmlFor="item-deposit" className={LABEL_CLASS}>
            סכום פיקדון (₪)
          </label>
          <input
            id="item-deposit"
            name="depositAmount"
            type="number"
            inputMode="decimal"
            min={0}
            max={100000}
            step="0.01"
            defaultValue={item?.depositAmount ?? 0}
            className="w-full rounded-lg border-none bg-surface-container-low px-4 py-5 text-center font-headline-md text-headline-md font-bold text-brand-deep transition-all focus:ring-2 focus:ring-trust-mint"
          />
          <p className="text-center font-label-md text-label-md text-on-surface-variant">
            הפיקדון נמסר ומוחזר ישירות בין השואל לבעל הפריט, מחוץ למערכת.
          </p>
        </div>
      </div>

      <FormMessage state={state} />

      <button
        type="submit"
        disabled={pending || processing}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-trust-mint py-5 font-headline-sm text-headline-sm font-bold text-brand-deep shadow-lg shadow-trust-mint/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60"
      >
        <MaterialIcon name={isEdit ? "save" : "publish"} />
        {pending ? "שולח..." : isEdit ? "שמירת שינויים" : "שליחה לאישור אדמין"}
      </button>
    </form>
  );
}
