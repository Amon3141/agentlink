import {
  CLOD_JSON_REPAIR_USER_PROMPT,
  normalizeClodRawToString,
  resolveClodAgentResponse,
  tryParseStructuredClodResponse,
} from "@/lib/validators/clod-response"
import type { ClodAgentResponse } from "@/lib/types"

const maxAttempts = 3
/** Must cover primary completion plus one JSON repair round-trip. */
const requestTimeoutMs = 55000

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }
type ClodResponseFormat = { type: "json_object" }

export async function callClodAgent(
  prompt: string,
  systemPrompt: string
): Promise<ClodAgentResponse> {
  const endpoint = process.env.CLOD_ENDPOINT
  const token = process.env.CLOD_API_KEY
  const model = process.env.CLOD_MODEL ?? "DeepSeek V3"

  if (!endpoint) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CLOD_ENDPOINT is required in production.")
    }

    return {
      message: demoAgentReply(prompt),
      thinkIsTerminated: prompt.toLowerCase().includes("accepted"),
      thinkIsTerminatedReason: prompt.toLowerCase().includes("accepted")
        ? "Goal achieved: the agents reached a clear agreement."
        : "",
    }
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

    try {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]

      const firstText = await fetchClodAssistantText(
        {
          endpoint,
          token,
          model,
          messages,
          temperature: 0.4,
          responseFormat: getClodResponseFormat(),
          signal: controller.signal,
        }
      )

      const resolved = await finalizeClodAssistantText({
        endpoint,
        token,
        model,
        systemPrompt,
        userPrompt: prompt,
        assistantText: firstText,
        signal: controller.signal,
      })

      clearTimeout(timeout)
      return resolved
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Clod request failed for an unknown reason.")
    } finally {
      clearTimeout(timeout)
    }

    await wait(250 * attempt)
  }

  throw lastError ?? new Error("Clod request failed.")
}

async function finalizeClodAssistantText({
  endpoint,
  token,
  model,
  systemPrompt,
  userPrompt,
  assistantText,
  signal,
}: {
  endpoint: string
  token: string | undefined
  model: string
  systemPrompt: string
  userPrompt: string
  assistantText: string
  signal: AbortSignal
}): Promise<ClodAgentResponse> {
  const firstStructured = tryParseStructuredClodResponse(assistantText)
  if (firstStructured) {
    return firstStructured
  }

  if (!assistantText.trim()) {
    return resolveClodAgentResponse("")
  }

  const repairText = await fetchClodAssistantText({
    endpoint,
    token,
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
      { role: "assistant", content: assistantText.slice(0, 12000) },
      { role: "user", content: CLOD_JSON_REPAIR_USER_PROMPT },
    ],
    temperature: 0.15,
    responseFormat: getClodResponseFormat(),
    signal,
  })

  const structured = tryParseStructuredClodResponse(repairText)
  if (structured) {
    return structured
  }

  return resolveClodAgentResponse(repairText)
}

async function fetchClodAssistantText({
  endpoint,
  token,
  model,
  messages,
  temperature,
  responseFormat,
  signal,
}: {
  endpoint: string
  token: string | undefined
  model: string
  messages: ChatMessage[]
  temperature: number
  responseFormat?: ClodResponseFormat
  signal: AbortSignal
}): Promise<string> {
  const response = await fetch(getChatCompletionsEndpoint(endpoint), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: 600,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Clod request failed with ${response.status}`)
  }

  const body = await response.json()
  return normalizeClodRawToString(extractAssistantContent(body)).trim()
}

function demoAgentReply(prompt: string) {
  const exchangeNumber = Number(/This is exchange (\d+)/.exec(prompt)?.[1] ?? 0)
  const turnCount = (prompt.match(/Turn #/g) ?? []).length
  if (exchangeNumber >= 3 || turnCount >= 2) {
    return "That works nicely. I will mark this as tentatively agreed and wait for the humans to approve the action."
  }

  return "Thanks for the context. I can help coordinate this warmly and will ask for one concrete next step."
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getChatCompletionsEndpoint(endpoint: string) {
  const trimmed = endpoint.replace(/\/$/, "")

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed
  }

  return `${trimmed}/chat/completions`
}

function getClodResponseFormat(): ClodResponseFormat | undefined {
  return process.env.CLOD_RESPONSE_FORMAT === "json_object"
    ? { type: "json_object" }
    : undefined
}

function extractAssistantContent(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "choices" in body &&
    Array.isArray(body.choices)
  ) {
    const content = body.choices[0]?.message?.content
    if (typeof content === "string") {
      return content
    }
    if (Array.isArray(content)) {
      return content
    }
    if (content && typeof content === "object") {
      return content
    }
  }

  return body
}
