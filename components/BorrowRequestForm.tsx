"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import { createBorrowRequestAction } from "@/lib/actions/borrow";

const DATE_FIELD =
  "w-full rounded-lg border border-outline-variant/50 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function BorrowRequestForm({
  itemId,
  totalQuantity,
  today,
  maxLoanDays,
}: {
  itemId: string;
  totalQuantity: number;
  today: string;
  maxLoanDays: number;
}) {
  const [state, action, pending] = useFormAction(createBorrowRequestAction);
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <FormMessage state={state} />
        <p className="text-sm text-on-surface-variant">
          תקבל/י את פרטי הקשר של בעל/ת הפריט לאחר אישור הבקשה.
        </p>
        <Link
          href="/my-loans?tab=pending"
          className="inline-block rounded-xl bg-brand-mint px-6 py-3 font-bold text-brand-deep"
        >
          לבקשות שלי
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="borrow-start"
            className="block font-label-md text-label-md text-on-surface-variant"
          >
            תאריך התחלה
          </label>
          <input
            id="borrow-start"
            name="startDate"
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={DATE_FIELD}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="borrow-end"
            className="block font-label-md text-label-md text-on-surface-variant"
          >
            תאריך סיום
          </label>
          <input
            id="borrow-end"
            name="endDate"
            type="date"
            required
            min={startDate || today}
            className={DATE_FIELD}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="borrow-quantity"
          className="block font-label-md text-label-md text-on-surface-variant"
        >
          כמות (עד {totalQuantity})
        </label>
        <div className="flex w-fit items-center rounded-lg border border-outline-variant/50 bg-white">
          <button
            type="button"
            aria-label="הפחת כמות"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="p-3 text-secondary transition-colors hover:bg-surface-container-low"
          >
            <MaterialIcon name="remove" />
          </button>
          <input
            id="borrow-quantity"
            name="requestedQuantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={totalQuantity}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            required
            className="w-14 border-none bg-transparent text-center font-bold focus:ring-0"
          />
          <button
            type="button"
            aria-label="הוסף כמות"
            onClick={() => setQuantity((value) => Math.min(totalQuantity, value + 1))}
            className="p-3 text-secondary transition-colors hover:bg-surface-container-low"
          >
            <MaterialIcon name="add" />
          </button>
        </div>
      </div>

      <FormMessage state={state} />

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-mint py-4 font-bold text-brand-deep shadow-lg shadow-brand-mint/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60"
      >
        <span>{pending ? "שולח..." : "שלח בקשה"}</span>
        <MaterialIcon name="send" />
      </button>
      <p className="text-center text-xs text-on-surface-variant">
        ניתן לבקש השאלה של עד {maxLoanDays} יום. הבקשה תישלח לאישור בעל/ת הפריט.
      </p>
    </form>
  );
}
