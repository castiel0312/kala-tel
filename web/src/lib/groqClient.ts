/**
 * Groq API Client for Geological & Potential Well Synthesis
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
 * Recommended models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const STORAGE_KEY = "nwis_groq_api_key";

export function getStoredGroqKey(): string {
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GROQ_API_KEY ?? "";
  if (envKey) return envKey;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveGroqKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* localStorage unavailable */
  }
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    total_tokens: number;
  };
}

export async function queryGroqLLM(
  messages: GroqMessage[],
  apiKey: string,
  model = "llama-3.3-70b-versatile",
): Promise<string> {
  const key = apiKey || getStoredGroqKey();
  if (!key) {
    throw new Error("No Groq API Key provided. Please enter your Groq API key in the planner.");
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      if (errJson.error?.message) detail = errJson.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(`Groq API Error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as GroqChatResponse;
  return data.choices[0]?.message?.content ?? "No analysis returned from Groq.";
}
