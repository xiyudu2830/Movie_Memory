import { NextResponse } from "next/server";

import { getFactByIdForUser } from "@/lib/facts";
import { getSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    factId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { factId } = await params;
  const fact = await getFactByIdForUser(session.user.id, factId);

  if (!fact) {
    return NextResponse.json({ error: "Fact not found." }, { status: 404 });
  }

  return NextResponse.json({
    fact: {
      id: fact.id,
      content: fact.content,
      movieTitle: fact.movieTitle,
      createdAt: fact.createdAt.toISOString(),
    },
  });
}