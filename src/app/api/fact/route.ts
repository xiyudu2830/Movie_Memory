import { NextResponse } from "next/server";

import { resolveMovieFact } from "@/lib/facts";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, favoriteMovie: true },
  });

  if (!user?.favoriteMovie) {
    return NextResponse.json(
      { error: "Complete onboarding before requesting a movie fact." },
      { status: 400 },
    );
  }

  const result = await resolveMovieFact({
    userId: user.id,
    movieTitle: user.favoriteMovie,
  });

  if (!result.fact) {
    return NextResponse.json({ error: result.message }, { status: 503 });
  }

  return NextResponse.json({
    fact: {
      id: result.fact.id,
      content: result.fact.content,
      movieTitle: result.fact.movieTitle,
      createdAt: result.fact.createdAt.toISOString(),
    },
    status: result.status,
    message: result.message,
  });
}