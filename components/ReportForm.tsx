"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { createReportAction } from "@/lib/actions/reports";
import { REPORT_REASONS } from "@/lib/validation/schemas";

const FIELD_CLASS =
  "font-body-md w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-on-surface transition-all focus:ring-2 focus:ring-trust-mint";
const LABEL_CLASS = "block font-label-md text-label-md font-bold text-secondary";

export function ReportForm({
  targetType,
  targetId,
}: {
  targetType: "item" | "user";
  targetId: string;
}) {
  const [state, action, pending] = useFormAction(createReportAction);

  // Reasons that only make sense for one kind of target are left out.
  const reasons = Object.entries(REPORT_REASONS).filter(([key]) =>
    targetType === "item" ? key !== "behavior" : key !== "damaged" && key !== "misleading",
  );

  if (state.success) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />

      <div className="space-y-2">
        <label htmlFor="report-reason" className={LABEL_CLASS}>
          מה הבעיה?
        </label>
        <select id="report-reason" name="reason" required defaultValue="" className={FIELD_CLASS}>
          <option value="" disabled>
            בחר/י סיבה
          </option>
          {reasons.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="report-details" className={LABEL_CLASS}>
          פירוט
        </label>
        <textarea
          id="report-details"
          name="details"
          required
          minLength={5}
          maxLength={1000}
          rows={4}
          placeholder="מה קרה? מתי? כל פרט שיעזור למנהל הקהילה לטפל."
          className={FIELD_CLASS}
        />
      </div>

      <FormMessage state={state} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-secondary px-6 py-3 font-bold text-on-secondary transition-transform active:scale-95 disabled:opacity-60"
      >
        {pending ? "שולח..." : "שליחת הדיווח"}
      </button>
    </form>
  );
}
