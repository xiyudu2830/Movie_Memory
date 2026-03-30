"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { favoriteMovieSchema } from "@/lib/validation";

export type OnboardingFormState = {
  error: string | null;
};

export const initialOnboardingState: OnboardingFormState = {
  error: null,
};

export async function saveFavoriteMovie(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const session = await getRequiredSession();

  const parsedMovie = favoriteMovieSchema.safeParse(formData.get("favoriteMovie"));

  if (!parsedMovie.success) {
    return {
      error: parsedMovie.error.issues[0]?.message ?? "Please enter a valid movie.",
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { favoriteMovie: parsedMovie.data },
  });

  redirect("/dashboard");
}