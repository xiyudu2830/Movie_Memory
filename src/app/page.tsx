import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import { GoogleSignInButton } from "@/components/auth-buttons";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteMovie: true },
    });

    redirect(user?.favoriteMovie ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel rounded-[2rem] p-8 sm:p-12">
          <p className="eyebrow text-sm font-medium text-muted">Movie Memory</p>
          <div className="mt-6 max-w-3xl space-y-6">
            <h1 className="heading-font text-5xl leading-none text-balance sm:text-7xl">
              Keep your favorite movie and a fresh AI fact in one calm place.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Sign in with Google, tell the app your all-time favorite movie, and
              get a fun fact generated for you and stored in Postgres.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <GoogleSignInButton className="min-w-56" />
            <div className="rounded-full border border-border px-5 py-3 text-sm text-muted">
              Server-side validation, protected routes, and OpenAI-backed trivia.
            </div>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-8 sm:p-10">
          <div className="space-y-6">
            <div>
              <p className="eyebrow text-sm font-medium text-muted">What you get</p>
              <h2 className="heading-font mt-3 text-3xl">A small app with tight edges.</h2>
            </div>
            <div className="grid gap-4">
              <article className="rounded-3xl bg-white/55 p-5">
                <p className="text-sm text-muted">Authentication</p>
                <p className="mt-2 text-lg font-medium">Google OAuth with protected dashboard access.</p>
              </article>
              <article className="rounded-3xl bg-white/55 p-5">
                <p className="text-sm text-muted">Persistence</p>
                <p className="mt-2 text-lg font-medium">Favorite movie and generated facts live in Postgres.</p>
              </article>
              <article className="rounded-3xl bg-white/55 p-5">
                <p className="text-sm text-muted">Correctness</p>
                <p className="mt-2 text-lg font-medium">Facts are cached for 60 seconds and guarded against bursts.</p>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
