import type { MovieFact } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  FACT_CACHE_WINDOW_MS,
  getFactByIdForUser,
  resolveMovieFact,
  shouldReuseCachedFact,
} from "@/lib/facts";

function buildFact(overrides: Partial<MovieFact> = {}): MovieFact {
  return {
    id: "fact-1",
    userId: "user-1",
    movieTitle: "Arrival",
    content: "Arrival was adapted from Ted Chiang's Story of Your Life.",
    createdAt: new Date("2026-03-30T12:00:00.000Z"),
    ...overrides,
  };
}

describe("shouldReuseCachedFact", () => {
  it("returns true when the latest fact is younger than 60 seconds", () => {
    const now = new Date("2026-03-30T12:00:59.000Z");
    const cachedAt = new Date(now.getTime() - (FACT_CACHE_WINDOW_MS - 1_000));

    expect(shouldReuseCachedFact(cachedAt, now)).toBe(true);
  });

  it("returns false when the latest fact is 60 seconds old or older", () => {
    const now = new Date("2026-03-30T12:01:00.000Z");
    const cachedAt = new Date(now.getTime() - FACT_CACHE_WINDOW_MS);

    expect(shouldReuseCachedFact(cachedAt, now)).toBe(false);
  });
});

describe("resolveMovieFact", () => {
  it("returns the cached fact without generating a new one inside the cache window", async () => {
    const now = new Date("2026-03-30T12:01:00.000Z");
    const latestFact = buildFact({ createdAt: new Date(now.getTime() - 15_000) });
    const generate = vi.fn();
    const lock = {
      acquire: vi.fn(),
      release: vi.fn(),
    };

    const result = await resolveMovieFact({
      userId: "user-1",
      movieTitle: "Arrival",
      now,
      generate,
      lock,
      store: {
        findLatestFact: vi.fn().mockResolvedValue(latestFact),
        createFact: vi.fn(),
        findFactById: vi.fn(),
      },
    });

    expect(result.status).toBe("cache");
    expect(result.fact?.id).toBe(latestFact.id);
    expect(generate).not.toHaveBeenCalled();
    expect(lock.acquire).not.toHaveBeenCalled();
  });

  it("generates and stores a new fact when the cache window has expired", async () => {
    const now = new Date("2026-03-30T12:01:00.000Z");
    const staleFact = buildFact({ createdAt: new Date(now.getTime() - FACT_CACHE_WINDOW_MS - 1_000) });
    const createdFact = buildFact({
      id: "fact-2",
      content: "Arrival's alien language was built to support the story's nonlinear view of time.",
      createdAt: now,
    });
    const generate = vi.fn().mockResolvedValue(createdFact.content);
    const createFact = vi.fn().mockResolvedValue(createdFact);
    const lock = {
      acquire: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
    };

    const result = await resolveMovieFact({
      userId: "user-1",
      movieTitle: "Arrival",
      now,
      generate,
      lock,
      store: {
        findLatestFact: vi
          .fn()
          .mockResolvedValueOnce(staleFact)
          .mockResolvedValueOnce(staleFact),
        createFact,
        findFactById: vi.fn(),
      },
    });

    expect(result.status).toBe("generated");
    expect(result.fact?.id).toBe(createdFact.id);
    expect(generate).toHaveBeenCalledWith("Arrival");
    expect(createFact).toHaveBeenCalledWith("user-1", "Arrival", createdFact.content);
    expect(lock.acquire).toHaveBeenCalledWith("user-1", "Arrival");
    expect(lock.release).toHaveBeenCalledWith("user-1");
  });
});

describe("getFactByIdForUser", () => {
  it("returns null when a fact belongs to a different user", async () => {
    const store = {
      findLatestFact: vi.fn(),
      createFact: vi.fn(),
      findFactById: vi.fn().mockResolvedValue(buildFact({ userId: "user-2" })),
    };

    await expect(getFactByIdForUser("user-1", "fact-2", store)).resolves.toBeNull();
  });
});