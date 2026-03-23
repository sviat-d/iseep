import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { aiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type AiProvider = "anthropic" | "openai";

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  isUserKey: boolean; // true = user's own key, false = platform key
};

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

export async function getAiConfig(workspaceId: string): Promise<AiConfig> {
  // Check for user's own key
  const [userKey] = await db
    .select()
    .from(aiKeys)
    .where(and(eq(aiKeys.workspaceId, workspaceId), eq(aiKeys.isActive, true)));

  if (userKey) {
    return {
      provider: userKey.provider,
      apiKey: userKey.apiKey,
      model:
        userKey.model ??
        (userKey.provider === "anthropic"
          ? DEFAULT_ANTHROPIC_MODEL
          : DEFAULT_OPENAI_MODEL),
      isUserKey: true,
    };
  }

  // Fall back to platform key
  return {
    provider: "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: DEFAULT_ANTHROPIC_MODEL,
    isUserKey: false,
  };
}

export async function callAi(
  config: AiConfig,
  systemPrompt: string | undefined,
  userMessage: string,
  maxTokens: number = 2000
): Promise<string> {
  if (config.provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: config.model,
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: "user", content: userMessage }],
    });
    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");
    return content.text;
  }

  if (config.provider === "openai") {
    // OpenAI-compatible API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        messages: [
          ...(systemPrompt
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
          { role: "user" as const, content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}
