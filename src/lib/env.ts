function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getGoogleOAuthConfig() {
  return {
    clientId: readRequiredEnv("GOOGLE_CLIENT_ID"),
    clientSecret: readRequiredEnv("GOOGLE_CLIENT_SECRET"),
  };
}

export function getOpenAIConfig() {
  return {
    apiKey: readRequiredEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  };
}