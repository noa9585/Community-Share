"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/MaterialIcon";
import type { ItemBooking } from "@/types/database";

const WEEKDAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"] as const;
const MONTHS_AHEAD = 12;

type DayState = "past" | "free" | "partial" | "full";

const DAY_CLASSES: Record<DayState, string> = {
  past: "border-secondary/10 text-on-surface-variant opacity-30",
  free: "border-secondary/10 bg-white",
  partial: "border-tertiary/30 bg-tertiary-container text-on-tertiary-fixed-variant",
  full: "border-error/20 bg-error-container/50 text-error",
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Occupancy calendar of one item. A day is "full" when every unit is out on
 * loan, "partial" when only some are. `today` comes from the server so the
 * calendar agrees with the booking rules regardless of the visitor's clock.
 */
export function AvailabilityCalendar({
  bookings,
  totalQuantity,
  today,
}: {
  bookings: ItemBooking[];
  totalQuantity: number;
  today: string;
}) {
  const [offset, setOffset] = useState(0);

  const [todayYear, todayMonth] = today.split("-").map(Number);
  const first = new Date(Date.UTC(todayYear, todayMonth - 1 + offset, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = first.getUTCDay();
  const monthLabel = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    const booked = bookings
      .filter((booking) => booking.start_date <= iso && iso <= booking.end_date)
      .reduce((sum, booking) => sum + booking.requested_quantity, 0);

    let state: DayState = "free";
    if (iso < today) state = "past";
    else if (booked >= totalQuantity) state = "full";
    else if (booked > 0) state = "partial";

    return { day, iso, state, free: Math.max(0, totalQuantity - booked) };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-secondary">
          לוח תפוסות – {monthLabel}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOffset((value) => Math.max(0, value - 1))}
            disabled={offset === 0}
            aria-label="החודש הקודם"
            className="rounded-full border border-secondary/10 p-2 transition-colors hover:bg-white disabled:opacity-30"
          >
            <MaterialIcon name="chevron_right" />
          </button>
          <button
            type="button"
            onClick={() => setOffset((value) => Math.min(MONTHS_AHEAD, value + 1))}
            disabled={offset === MONTHS_AHEAD}
            aria-label="החודש הבא"
            className="rounded-full border border-secondary/10 p-2 transition-colors hover:bg-white disabled:opacity-30"
          >
            <MaterialIcon name="chevron_left" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-1 text-center font-label-md text-label-md text-on-surface-variant"
          >
            {weekday}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {days.map(({ day, iso, state, free }) => (
          <div
            key={iso}
            title={
              state === "past"
                ? undefined
                : state === "full"
                  ? "תפוס"
                  : `${free} מתוך ${totalQuantity} פנויים`
            }
            className={`flex aspect-square items-center justify-center rounded-lg border text-label-md ${
              DAY_CLASSES[state]
            } ${iso === today ? "ring-2 ring-brand-mint" : ""}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-label-md text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-secondary/20 bg-white" /> פנוי
        </span>
        {totalQuantity > 1 && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-tertiary/30 bg-tertiary-container" />
            פנוי חלקית
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-error/20 bg-error-container/50" />
          תפוס
        </span>
      </div>
    </div>
  );
}
