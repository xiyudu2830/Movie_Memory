import Image from "next/image";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth-buttons";
import { resolveMovieFact } from "@/lib/facts";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";

function getDisplayName(name: string | null, email: string | null) {
  if (name?.trim()) {
    return name;
  }

  if (email?.trim()) {
    return email;
  }

  return "Movie fan";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      favoriteMovie: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  if (!user.favoriteMovie) {
    redirect("/onboarding");
  }

  const factResult = await resolveMovieFact({
    userId: user.id,
    movieTitle: user.favoriteMovie,
  });
  const displayName = getDisplayName(user.name, user.email);

  return (
    <main className="page-shell min-h-screen px-6 py-10 sm:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel rounded-[2rem] p-8 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-sm font-medium text-muted">Dashboard</p>
              <h1 className="heading-font mt-3 text-4xl sm:text-5xl">Your movie memory</h1>
            </div>
            <LogoutButton />
          </div>

          <div className="mt-8 flex items-center gap-4 rounded-[1.75rem] bg-white/65 p-4 sm:p-5">
            {user.image ? (
              <Image
                src={user.image}
                alt={`${displayName} profile`}
                className="size-16 rounded-2xl object-cover"
                width={64}
                height={64}
                unoptimized
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-white">
                {getInitials(displayName) || "MM"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-2xl font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted">{user.email ?? "Google did not return an email address."}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-border bg-white/55 p-5">
            <p className="text-sm text-muted">Favorite movie</p>
            <p className="heading-font mt-2 text-3xl">{user.favoriteMovie}</p>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-8 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-sm font-medium text-muted">AI fact</p>
              <h2 className="heading-font mt-3 text-3xl">A fresh detail about your pick</h2>
            </div>
            <a
              href="/dashboard"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-white/65"
            >
              Refresh
            </a>
          </div>

          <div className="mt-8 rounded-[1.75rem] bg-white/65 p-6 sm:p-8">
            {factResult.fact ? (
              <>
                <p className="text-xl leading-8 text-balance">{factResult.fact.content}</p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted">
                  <span className="rounded-full bg-black/5 px-3 py-1">Source: {factResult.status}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">
                    Saved at {factResult.fact.createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-lg leading-8 text-muted">
                {factResult.message ?? "A movie fact is not available yet."}
              </p>
            )}
          </div>

          {factResult.message ? (
            <p className="mt-4 rounded-2xl border border-border bg-white/55 px-4 py-3 text-sm text-muted">
              {factResult.message}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}