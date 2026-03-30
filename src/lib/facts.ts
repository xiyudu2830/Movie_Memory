import type { MovieFact } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { generateMovieFact } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const FACT_CACHE_WINDOW_MS = 60_000;
const FACT_LOCK_STALE_MS = 30_000;

export type FactResolutionResult = {
  fact: MovieFact | null;
  status: "cache" | "generated" | "fallback" | "error";
  message?: string;
};

type FactStore = {
  findLatestFact(userId: string, movieTitle: string): Promise<MovieFact | null>;
  createFact(userId: string, movieTitle: string, content: string): Promise<MovieFact>;
  findFactById(factId: string): Promise<MovieFact | null>;
};

type FactLock = {
  acquire(userId: string, movieTitle: string): Promise<boolean>;
  release(userId: string): Promise<void>;
};

type FactGenerator = (movieTitle: string) => Promise<string>;

type ResolveMovieFactInput = {
  userId: string;
  movieTitle: string;
  now?: Date;
  store?: FactStore;
  lock?: FactLock;
  generate?: FactGenerator;
};

const prismaFactStore: FactStore = {
  findLatestFact(userId, movieTitle) {
    return prisma.movieFact.findFirst({
      where: { userId, movieTitle },
      orderBy: { createdAt: "desc" },
    });
  },
  createFact(userId, movieTitle, content) {
    return prisma.movieFact.create({
      data: { userId, movieTitle, content },
    });
  },
  findFactById(factId) {
    return prisma.movieFact.findUnique({ where: { id: factId } });
  },
};

const postgresFactLock: FactLock = {
  async acquire(userId, movieTitle) {
    try {
      await prisma.factGenerationLock.create({
        data: { userId, movieTitle },
      });

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingLock = await prisma.factGenerationLock.findUnique({
          where: { userId },
        });

        if (
          existingLock &&
          Date.now() - existingLock.updatedAt.getTime() > FACT_LOCK_STALE_MS
        ) {
          await prisma.factGenerationLock.delete({ where: { userId } }).catch(() => null);

          return postgresFactLock.acquire(userId, movieTitle);
        }

        return false;
      }

      throw error;
    }
  },
  async release(userId) {
    await prisma.factGenerationLock.delete({ where: { userId } }).catch(() => null);
  },
};

export function shouldReuseCachedFact(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() < FACT_CACHE_WINDOW_MS;
}

export async function resolveMovieFact({
  userId,
  movieTitle,
  now = new Date(),
  store = prismaFactStore,
  lock = postgresFactLock,
  generate = generateMovieFact,
}: ResolveMovieFactInput): Promise<FactResolutionResult> {
  const latestFact = await store.findLatestFact(userId, movieTitle);

  if (latestFact && shouldReuseCachedFact(latestFact.createdAt, now)) {
    return {
      fact: latestFact,
      status: "cache",
    };
  }

  const hasLock = await lock.acquire(userId, movieTitle);

  if (!hasLock) {
    return latestFact
      ? {
          fact: latestFact,
          status: "fallback",
          message: "A fresh fact is already being generated in another request, so the latest saved fact is shown for now.",
        }
      : {
          fact: null,
          status: "error",
          message: "A movie fact is already being generated. Please refresh in a moment.",
        };
  }

  try {
    const refreshedLatestFact = await store.findLatestFact(userId, movieTitle);

    if (refreshedLatestFact && shouldReuseCachedFact(refreshedLatestFact.createdAt, now)) {
      return {
        fact: refreshedLatestFact,
        status: "cache",
      };
    }

    const content = await generate(movieTitle);
    const fact = await store.createFact(userId, movieTitle, content);

    return {
      fact,
      status: "generated",
    };
  } catch {
    const fallbackFact = await store.findLatestFact(userId, movieTitle);

    if (fallbackFact) {
      return {
        fact: fallbackFact,
        status: "fallback",
        message: "OpenAI could not generate a fresh fact, so the latest saved fact is shown instead.",
      };
    }

    return {
      fact: null,
      status: "error",
      message: "We could not generate a movie fact right now. Please try again shortly.",
    };
  } finally {
    await lock.release(userId);
  }
}

export async function getFactByIdForUser(
  userId: string,
  factId: string,
  store: FactStore = prismaFactStore,
): Promise<MovieFact | null> {
  const fact = await store.findFactById(factId);

  if (!fact || fact.userId !== userId) {
    return null;
  }

  return fact;
}