"use client";

// Shown when a page throws. The underlying error is never rendered: details
// stay in the server logs and the visitor only sees a neutral message.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-container p-6">
      <div className="w-full max-w-md rounded-2xl border border-secondary/15 bg-white p-6 text-center">
        <h1 className="font-headline text-xl font-semibold text-brand-deep">משהו השתבש</h1>
        <p className="mt-2 text-on-surface-variant">
          לא הצלחנו להשלים את הפעולה. אפשר לנסות שוב בעוד רגע.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-brand-mint px-5 py-2.5 font-bold text-brand-deep"
        >
          נסה שוב
        </button>
      </div>
    </div>
  );
}
