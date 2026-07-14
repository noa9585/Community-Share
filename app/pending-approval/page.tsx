"use client";

import { refreshProfileAction } from "@/lib/actions/auth";

export default function PendingApprovalPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 text-center">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-bold">ממתין לאישור אדמין</h1>
        <p className="mt-3 text-zinc-600">
          החשבון שלך נרשם בהצלחה. אדמין הקהילה יאשר אותך בקרוב ואז תוכל/י לגשת
          לקטלוג ולהשאיל פריטים.
        </p>
        <form action={refreshProfileAction} className="mt-6">
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            בדוק שוב
          </button>
        </form>
      </div>
    </div>
  );
}
