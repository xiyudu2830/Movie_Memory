# Movie Memory

Movie Memory is a full-stack Next.js application.

It supports:

- Google OAuth sign-in
- first-time onboarding with server-side validation
- a protected dashboard showing Google profile data plus the stored favorite movie
- AI-generated movie facts stored in Postgres
- Variant A: backend-focused 60-second caching, burst protection, failure fallback, and backend tests

## Chosen Variant

I chose Variant A, the backend-focused version.

Reasoning:

- The base requirements already depend heavily on authenticated server state.
- Variant A gave better room to demonstrate data modeling, authorization boundaries, cache correctness, and failure handling.
- It also kept the UI focused and let the main complexity live where correctness matters most: the server and database layer.

## Tech Stack

- TypeScript
- Next.js App Router
- React
- Tailwind CSS
- Postgres
- Prisma
- NextAuth / Google OAuth
- OpenAI API
- Vitest for backend tests

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the real values.

Required variables:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/movie_memory?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-string"
GOOGLE_CLIENT_ID="replace-with-your-google-client-id"
GOOGLE_CLIENT_SECRET="replace-with-your-google-client-secret"
OPENAI_API_KEY="replace-with-your-openai-api-key"
OPENAI_MODEL="gpt-4.1-mini"
```

### 3. Set up Google OAuth

In Google Cloud Console:

1. Create an OAuth client for a web application.
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Copy the client ID and client secret into `.env`.

### 4. Run database migrations

```bash
npx prisma migrate dev
```

If you want the exact checked-in migration to apply, Prisma will use the migration under `prisma/migrations`.

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run lint
npm test
npm run build
npx prisma studio
```

## Database Migration Notes

This repository includes:

- Prisma schema in `prisma/schema.prisma`
- checked-in SQL migration in `prisma/migrations/20260330142800_init/migration.sql`

Typical local flow:

```bash
npx prisma migrate dev
npx prisma generate
```

## Product Behavior

### Authentication

- Unauthenticated users visiting `/` see a landing page with a Google sign-in button.
- After login, the app checks whether the user already has a stored favorite movie.
- First-time users are redirected to `/onboarding`.
- Returning users are redirected to `/dashboard`.
- `/dashboard` redirects back to `/` when unauthenticated.

### Onboarding

- The onboarding form asks for the favorite movie.
- Validation happens server-side with trimming and min/max length enforcement.
- The movie is stored in Postgres on the authenticated user record.

### Dashboard

The dashboard shows:

- user name, with fallback when missing
- user email, with graceful fallback text when missing
- user photo when available, otherwise generated initials
- favorite movie from the database
- logout button
- latest movie fact from the fact service

### Fun Fact Generation

Facts are generated on the server with OpenAI and stored in Postgres.

For Variant A, the backend adds:

- a 60-second cache window per user and movie title
- a DB-backed generation lock to avoid burst duplicate generation
- fallback to the most recent saved fact when OpenAI fails
- a friendly error when no cached fact exists and generation fails

## Architecture Overview

### High-level flow

1. Auth.js handles Google OAuth and stores users, accounts, and sessions in Postgres through Prisma.
2. The landing page is a server component that checks the current session and redirects based on onboarding state.
3. Onboarding uses a server action to validate and persist the favorite movie.
4. The dashboard is server-rendered and fetches the authenticated user plus a fact for that user’s saved movie.
5. Fact generation goes through a small service layer that centralizes cache logic, burst protection, and fallback behavior.

### Data model

The schema has the standard Auth.js tables plus two app-specific choices:

- `favoriteMovie` lives directly on `User`
- `MovieFact` stores every generated fact with `userId`, `movieTitle`, `content`, and `createdAt`

Why keep `favoriteMovie` on `User` instead of a separate profile table?

- There is only one onboarding field.
- The relationship is always one-to-one.
- Keeping it on `User` removes joins and keeps the onboarding path straightforward.

Why store every fact instead of overwriting one row?

- It gives a clear fact history.
- It makes the “most recent fact” cache rule simple.
- It allows graceful fallback to the latest saved fact if OpenAI fails.

### Cache and concurrency strategy

The cache rule is implemented as:

- fetch the latest fact for the current user and movie
- if it is newer than 60 seconds, return it directly
- otherwise try to acquire a generation lock

For burst protection I used a `FactGenerationLock` table keyed by `userId`.

Why this approach:

- it is database-backed, so it works across multiple tabs and multiple app instances
- it avoids relying on in-memory process state
- it is simpler to reason about in a take-home setting than long-running DB transactions or advisory-lock connection management

If a lock already exists:

- the request does not start another OpenAI generation
- it returns the most recent saved fact when one exists
- otherwise it returns a user-friendly error

There is also a stale-lock timeout so a stuck generation cannot block the user forever.

### Authorization boundaries

The app never accepts an arbitrary user ID from the client to fetch facts for display.

- `/dashboard` always resolves data for the authenticated session user
- `/api/fact` only uses the authenticated session user
- `/api/facts/[factId]` verifies the requested fact belongs to the current user before returning it

This keeps ownership checks server-side and avoids insecure direct object access.

### Error handling

Important failure cases handled explicitly:

- invalid onboarding input returns a validation message
- unauthenticated API access returns `401`
- OpenAI timeout or error returns the latest cached fact when available
- if no cached fact exists, the user gets a clear retry message
- missing Google name or photo degrades gracefully instead of breaking rendering

## Tests

Backend tests cover the required Variant A behaviors:

- 60-second cache logic
- new fact generation when cache is expired
- authorization behavior preventing access to another user’s fact

Run them with:

```bash
npm test
```

## Key Tradeoffs

1. I used server-rendered dashboard data instead of adding a richer client state layer.
	This keeps auth and data ownership simpler and was the right tradeoff for Variant A.

2. I stored the favorite movie on `User` instead of introducing a separate profile model.
	That keeps the schema smaller and matches the current product scope.

3. I used a dedicated lock table rather than in-memory locking.
	This is more robust across tabs and deployments, though it adds one more table and lock cleanup logic.

4. The OpenAI response is generated on demand and stored verbatim.
	I did not add a moderation or fact-verification layer because it would have exceeded the time box.

## What I Would Improve With 2 More Hours

1. Add integration tests around the route handlers with a test database.
2. Add edit-movie support on the dashboard and invalidate the cached fact history more explicitly.
3. Add observability around fact generation latency and OpenAI failures.
4. Add better retry behavior when a generation lock is already in progress.
5. Add a small history view of past generated facts.

## AI Usage

- Used AI to help scaffold the initial project structure.
- Used AI to accelerate boilerplate for Prisma, Auth.js, and Next.js route wiring.
- Used AI to pressure-test the cache and concurrency design before implementation.
- All generated code was reviewed, edited, validated with lint/tests/build, and adjusted for correctness.

## Validation Performed

The repository was validated with:

```bash
npm run lint
npm test
npm run build
```
