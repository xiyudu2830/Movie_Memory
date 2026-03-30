"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  initialOnboardingState,
  saveFavoriteMovie,
} from "@/app/actions/onboarding";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Saving..." : "Save favorite movie"}
    </button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useActionState(saveFavoriteMovie, initialOnboardingState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-muted">Favorite movie</span>
        <input
          type="text"
          name="favoriteMovie"
          placeholder="For example: Spirited Away"
          className="w-full rounded-3xl border border-border bg-white/80 px-5 py-4 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          maxLength={120}
          required
        />
      </label>
      {state.error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}