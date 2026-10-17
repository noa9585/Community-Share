"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import { createBorrowRequestAction } from "@/lib/actions/borrow";
import type { ItemBooking } from "@/types/database";

/**
 * Fewest free units on any day of the range. Mirrors the rule the database
 * enforces, so the borrower sees the problem before sending the request.
 */
function minFreeUnits(
  bookings: ItemBooking[],
  totalQuantity: number,
  start: string,
  end: string,
): number {
  let minFree = totalQuantity;
  const day = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  for (let guard = 0; day <= last && guard < 370; guard += 1) {
    const iso = day.toISOString().slice(0, 10);
    const booked = bookings
      .filter((booking) => booking.start_date <= iso && iso <= booking.end_date)
      .reduce((sum, booking) => sum + booking.requested_quantity, 0);
    minFree = Math.min(minFree, totalQuantity - booked);
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return Math.max(0, minFree);
}

const DATE_FIELD =
  "w-full rounded-lg border border-outline-variant/50 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function BorrowRequestForm({
  itemId,
  totalQuantity,
  bookings,
  today,
  maxLoanDays,
}: {
  itemId: string;
  totalQuantity: number;
  bookings: ItemBooking[];
  today: string;
  maxLoanDays: number;
}) {
  const [state, action, pending] = useFormAction(createBorrowRequestAction);
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const rangeChosen = Boolean(startDate && endDate && endDate >= startDate);
  const freeUnits = rangeChosen
    ? minFreeUnits(bookings, totalQuantity, startDate, endDate)
    : totalQuantity;
  const notEnough = rangeChosen && quantity > freeUnits;

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
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
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

      {rangeChosen && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            notEnough ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {freeUnits === 0
            ? "הפריט תפוס בתאריכים שנבחרו. נסה/י תאריכים אחרים לפי לוח התפוסות."
            : notEnough
              ? `בתאריכים שנבחרו פנויות רק ${freeUnits} יחידות.`
              : `בתאריכים שנבחרו פנויות ${freeUnits} יחידות.`}
        </p>
      )}

      <FormMessage state={state} />

      <button
        type="submit"
        disabled={pending || notEnough}
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
