const STATUS_STYLES: Record<string, string> = {
  pending: "bg-primary-fixed text-on-primary-fixed border-primary/10",
  approved: "bg-primary-container text-on-primary-container border-primary/10",
  rejected: "bg-error-container text-on-error-container border-error/10",
  cancelled: "bg-surface-variant text-on-surface-variant border-outline-variant/30",
  blocked: "bg-error-container text-on-error-container border-error/10",
  active: "bg-secondary-container text-on-secondary-container border-secondary/10",
  returned_pending_confirmation: "bg-tertiary-container text-on-tertiary-container border-tertiary/10",
  completed: "bg-surface-variant text-on-surface-variant border-outline-variant/30",
  late: "bg-error-container text-on-error-container border-error/10",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  rejected: "נדחה",
  cancelled: "בוטל",
  blocked: "חסום",
  active: "פעיל",
  returned_pending_confirmation: "ממתין לאישור החזרה",
  completed: "הסתיים",
  late: "באיחור",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[status] ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const REPORT_STATUS: Record<string, { label: string; className: string }> = {
  open: { label: "פתוח", className: "bg-error-container text-on-error-container border-error/10" },
  in_progress: {
    label: "בטיפול",
    className: "bg-tertiary-container text-on-tertiary-container border-tertiary/10",
  },
  resolved: {
    label: "טופל",
    className: "bg-primary-container text-on-primary-container border-primary/10",
  },
  dismissed: {
    label: "נסגר ללא פעולה",
    className: "bg-surface-variant text-on-surface-variant border-outline-variant/30",
  },
};

/** Reports have their own wording, so "open" is not confused with a loan state. */
export function ReportStatusBadge({ status }: { status: string }) {
  const entry = REPORT_STATUS[status];
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${entry?.className ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"}`}
    >
      {entry?.label ?? status}
    </span>
  );
}

export function AvailabilityBadge({
  available,
  total,
}: {
  available: number;
  total: number;
}) {
  const isAvailable = available > 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
        isAvailable
          ? "bg-primary-container text-on-primary-container"
          : "bg-surface-variant text-on-surface-variant"
      }`}
    >
      {isAvailable ? "פנוי" : "בהשאלה"}
    </span>
  );
}
