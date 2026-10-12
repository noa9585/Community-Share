"use client";

import { AUTH_BUTTON, AUTH_INPUT, AUTH_LABEL } from "@/components/AuthCard";
import { FormMessage, useFormAction } from "@/components/FormHelpers";
import {
  resetPasswordAction,
  updatePasswordAction,
  updateProfileAction,
} from "@/lib/actions/auth";
import { RESIDENCE_AREAS } from "@/lib/validation/schemas";

export function ForgotPasswordForm() {
  const [state, action, pending] = useFormAction(resetPasswordAction);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className={AUTH_LABEL}>
          אימייל
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          dir="ltr"
          className={AUTH_INPUT}
        />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={AUTH_BUTTON}>
        {pending ? "שולח..." : "שלח קישור לאיפוס"}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useFormAction(updatePasswordAction);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="new-password" className={AUTH_LABEL}>
          סיסמה חדשה
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          minLength={10}
          maxLength={72}
          autoComplete="new-password"
          dir="ltr"
          aria-describedby="new-password-hint"
          className={AUTH_INPUT}
        />
        <p id="new-password-hint" className="mt-1 text-xs text-on-surface-variant">
          לפחות 10 תווים, כולל אות וספרה
        </p>
      </div>
      <div>
        <label htmlFor="confirm-password" className={AUTH_LABEL}>
          אימות סיסמה
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          required
          maxLength={72}
          autoComplete="new-password"
          dir="ltr"
          className={AUTH_INPUT}
        />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={AUTH_BUTTON}>
        {pending ? "מעדכן..." : "עדכון סיסמה"}
      </button>
    </form>
  );
}

export function ProfileForm({
  fullName,
  residenceArea,
}: {
  fullName: string;
  residenceArea: string;
}) {
  const [state, action, pending] = useFormAction(updateProfileAction);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="profile-name" className={AUTH_LABEL}>
          שם מלא
        </label>
        <input
          id="profile-name"
          name="fullName"
          required
          minLength={2}
          maxLength={100}
          defaultValue={fullName}
          autoComplete="name"
          className={AUTH_INPUT}
        />
      </div>
      <div>
        <label htmlFor="profile-area" className={AUTH_LABEL}>
          אזור מגורים
        </label>
        <select
          id="profile-area"
          name="residenceArea"
          required
          defaultValue={residenceArea}
          className={AUTH_INPUT}
        >
          {RESIDENCE_AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={AUTH_BUTTON}>
        {pending ? "שומר..." : "שמירת פרופיל"}
      </button>
    </form>
  );
}
