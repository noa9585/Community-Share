"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { createItemAction } from "@/lib/actions/items";
import { RESIDENCE_AREAS } from "@/lib/validation/schemas";

export function NewItemForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useFormAction(createItemAction);

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input
        name="name"
        required
        placeholder="שם הפריט"
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      />
      <textarea
        name="description"
        placeholder="תיאור"
        rows={4}
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      />
      <select
        name="categoryId"
        required
        defaultValue=""
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      >
        <option value="" disabled>
          קטגוריה
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input
        name="conditionRating"
        type="number"
        min={1}
        max={10}
        defaultValue={8}
        required
        placeholder="מצב (1-10)"
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      />
      <input
        name="totalQuantity"
        type="number"
        min={1}
        defaultValue={1}
        required
        placeholder="כמות"
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      />
      <input
        name="depositAmount"
        type="number"
        min={0}
        step="0.01"
        defaultValue={0}
        placeholder="פיקדון (₪)"
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      />
      <select
        name="area"
        required
        defaultValue=""
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      >
        <option value="" disabled>
          אזור
        </option>
        {RESIDENCE_AREAS.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
      <label className="block space-y-1 text-sm">
        <span>תמונות (JPEG/PNG/WebP, עד 5MB)</span>
        <input
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="w-full rounded-xl border border-zinc-300 px-4 py-3"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? "שולח..." : "שלח לאישור אדמין"}
      </button>
    </form>
  );
}
