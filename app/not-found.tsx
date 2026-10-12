import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-container p-6">
      <div className="w-full max-w-md rounded-2xl border border-secondary/15 bg-white p-6 text-center">
        <h1 className="font-headline text-xl font-semibold text-brand-deep">הדף לא נמצא</h1>
        <p className="mt-2 text-on-surface-variant">ייתכן שהפריט הוסר או שהקישור שגוי.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-brand-mint px-5 py-2.5 font-bold text-brand-deep"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
