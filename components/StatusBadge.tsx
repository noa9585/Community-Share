const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  blocked: "bg-red-100 text-red-800",
  active: "bg-blue-100 text-blue-800",
  returned_pending_confirmation: "bg-purple-100 text-purple-800",
  completed: "bg-zinc-100 text-zinc-700",
  late: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  rejected: "נדחה",
  blocked: "חסום",
  active: "פעיל",
  returned_pending_confirmation: "ממתין לאישור החזרה",
  completed: "הסתיים",
  late: "באיחור",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
