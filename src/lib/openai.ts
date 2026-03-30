import OpenAI from "openai";

import { getOpenAIConfig } from "@/lib/env";

export async function generateMovieFact(movieTitle: string): Promise<string> {
  const openAIConfig = getOpenAIConfig();
  const client = new OpenAI({
    apiKey: openAIConfig.apiKey,
  });

  const response = await client.responses.create(
    {
      model: openAIConfig.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a careful movie trivia writer. Produce exactly one accurate, upbeat fun fact in one or two sentences.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Share a fun fact about the movie \"${movieTitle}\". If you are unsure about a detail, choose a well-known production or casting fact instead of guessing.`,
            },
          ],
        },
      ],
    },
    {
      signal: AbortSignal.timeout(10_000),
    },
  );

  const fact = response.output_text.trim();

  if (!fact) {
    throw new Error("OpenAI returned an empty response.");
  }

  return fact;
}