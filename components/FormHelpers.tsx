"use client";

import { useActionState } from "react";

import type { ActionResult } from "@/lib/actions/auth";

const initialState: ActionResult = {};

export function FormMessage({ state }: { state: ActionResult }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.success}
      </p>
    );
  }
  return null;
}

export function useFormAction(
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>,
) {
  return useActionState(action, initialState);
}
