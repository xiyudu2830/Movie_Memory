import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding-form";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getRequiredSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteMovie: true },
  });

  if (user?.favoriteMovie) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-6 py-12">
      <section className="panel w-full max-w-2xl rounded-[2rem] p-8 sm:p-12">
        <p className="eyebrow text-sm font-medium text-muted">Onboarding</p>
        <h1 className="heading-font mt-4 text-4xl leading-tight sm:text-5xl">
          Tell us the movie you return to again and again.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          We store this server-side in Postgres and use it to generate a movie fact
          for your dashboard.
        </p>
        <OnboardingForm />
      </section>
    </main>
  );
}