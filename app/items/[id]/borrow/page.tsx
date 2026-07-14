"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { createBorrowRequestAction } from "@/lib/actions/borrow";

export default function BorrowRequestPage() {
  const params = useParams<{ id: string }>();
  const [state, action, pending] = useFormAction(createBorrowRequestAction);

  return (
    <div>
      <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
        <Link href={`/items/${params.id}`} className="text-sm text-emerald-700">
          חזרה לפריט
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-2xl font-bold">בקשת השאלה</h1>
          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="itemId" value={params.id} />
            <FormMessage state={state} />
            <label className="block space-y-1 text-sm">
              <span>תאריך התחלה</span>
              <input
                name="startDate"
                type="date"
                required
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>תאריך סיום</span>
              <input
                name="endDate"
                type="date"
                required
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>כמות</span>
              <input
                name="requestedQuantity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60"
            >
              {pending ? "שולח..." : "שלח בקשה"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
