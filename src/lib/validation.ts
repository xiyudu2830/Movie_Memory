import { z } from "zod";

export const favoriteMovieSchema = z
  .string({ error: "Favorite movie is required." })
  .trim()
  .min(1, "Please enter a movie title.")
  .max(120, "Movie titles must be 120 characters or fewer.");