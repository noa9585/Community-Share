import { logoutAction } from "@/lib/actions/auth";

export default function BlockedPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 text-center">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-bold text-red-700">החשבון חסום</h1>
        <p className="mt-3 text-zinc-600">
          אין לך גישה לפלטפורמה. פנה/י לאדמין הקהילה לפרטים נוספים.
        </p>
        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white"
          >
            יציאה
          </button>
        </form>
      </div>
    </div>
  );
}
