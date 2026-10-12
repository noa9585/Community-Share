// Shown while a page's data is loading from the server.
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-primary-container"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-secondary/20 border-t-secondary" />
      <span className="font-label-md text-label-md text-secondary">טוען...</span>
    </div>
  );
}
