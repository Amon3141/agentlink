import { parseClodAgentResponse } from "@/lib/validators/clod-response"
import type { ClodAgentResponse } from "@/lib/types"

const maxAttempts = 3
const requestTimeoutMs = 20000

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
      const response = await fetch(getChatCompletionsEndpoint(endpoint), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_completion_tokens: 600,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500
        const message = `Clod request failed with ${response.status}`

        if (!retryable || attempt === maxAttempts) {
          throw new Error(message)
        }

        lastError = new Error(message)
      } else {
        const body = await response.json()
        return parseClodAgentResponse(extractAssistantContent(body))
      }
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

function demoAgentReply(prompt: string) {
  const turnCount = (prompt.match(/Turn #/g) ?? []).length
  if (turnCount >= 2) {
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
  }

  return body
}
