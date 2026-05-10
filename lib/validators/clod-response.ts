import { z } from "zod"

export const clodToolRequestSchema = z.object({
  toolId: z.string().regex(/^[a-z_]+\.[a-z_]+$/),
  connectionId: z.string().uuid(),
  input: z.record(z.string(), z.unknown()).default({}),
})

export const clodAgentResponseSchema = z.object({
  message: z.string().min(1),
  thinkIsTerminated: z.boolean(),
  thinkIsTerminatedReason: z.string().default(""),
  toolRequest: clodToolRequestSchema.optional(),
})

export type ParsedClodAgentResponse = z.infer<typeof clodAgentResponseSchema>

const FALLBACK_MESSAGE =
  "I hit a formatting glitch on my side, but I'm still here — let's continue."

/** Normalize API `content` or arbitrary values to a string for parsing. */
export function normalizeClodRawToString(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return ""
  }
  if (typeof raw === "string") {
    return raw
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw)
  }
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (part && typeof part === "object") {
          const p = part as Record<string, unknown>
          if (typeof p.text === "string") {
            return p.text
          }
          if (typeof p.content === "string") {
            return p.content
          }
        }
        return ""
      })
      .join("")
  }
  if (typeof raw === "object" && "content" in raw && typeof (raw as { content: unknown }).content === "string") {
    return (raw as { content: string }).content
  }
  try {
    return JSON.stringify(raw)
  } catch {
    return ""
  }
}

export function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim()
  const match = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i.exec(trimmed)
  if (match?.[1]) {
    return match[1].trim()
  }
  const loose = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (loose?.[1]) {
    return loose[1].trim()
  }
  return trimmed
}

/** Extract first balanced `{ ... }` substring, respecting strings and escapes. */
export function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{")
  if (start === -1) {
    return null
  }
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i += 1) {
    const c = text[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (c === "\\") {
        escape = true
        continue
      }
      if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === "{") {
      depth += 1
    } else if (c === "}") {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

function extractJsonTextCandidate(text: string): string | null {
  const unfenced = stripMarkdownCodeFence(text.trim())
  try {
    const parsed = JSON.parse(unfenced)
    if (parsed && typeof parsed === "object") {
      return unfenced
    }
  } catch {
    /* try brace extraction */
  }
  const balanced = extractBalancedJsonObject(unfenced)
  if (balanced) {
    return balanced
  }
  return null
}

function coerceMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim()
    return t.length > 0 ? t : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

/**
 * Parses assistant output into a structured response when JSON is present and valid enough.
 * Invalid `toolRequest` objects are omitted so tool execution never runs on bad IDs.
 */
export function tryParseStructuredClodResponse(raw: unknown): ParsedClodAgentResponse | null {
  const text = normalizeClodRawToString(raw)
  const jsonText = extractJsonTextCandidate(text)
  if (!jsonText) {
    return null
  }

  let obj: unknown
  try {
    obj = JSON.parse(jsonText)
  } catch {
    return null
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return null
  }

  const o = obj as Record<string, unknown>
  const message = coerceMessage(o.message)
  if (!message) {
    return null
  }

  const thinkIsTerminated = typeof o.thinkIsTerminated === "boolean" ? o.thinkIsTerminated : false
  const thinkIsTerminatedReason =
    typeof o.thinkIsTerminatedReason === "string" ? o.thinkIsTerminatedReason : ""

  let toolRequest: ParsedClodAgentResponse["toolRequest"]
  if (o.toolRequest !== undefined && o.toolRequest !== null && typeof o.toolRequest === "object") {
    const tr = clodToolRequestSchema.safeParse(o.toolRequest)
    if (tr.success) {
      toolRequest = {
        toolId: tr.data.toolId,
        connectionId: tr.data.connectionId,
        input: tr.data.input ?? {},
      }
    }
  }

  const candidate = {
    message,
    thinkIsTerminated,
    thinkIsTerminatedReason,
    toolRequest,
  }
  const validated = clodAgentResponseSchema.safeParse(candidate)
  return validated.success ? validated.data : null
}

/**
 * Never throws. Uses structured JSON when possible; otherwise returns a safe plaintext message
 * so the conversation can continue.
 */
export function resolveClodAgentResponse(raw: unknown): ParsedClodAgentResponse {
  const structured = tryParseStructuredClodResponse(raw)
  if (structured) {
    return structured
  }

  let text = normalizeClodRawToString(raw).trim()
  text = stripMarkdownCodeFence(text).trim()
  text = text.replace(/\s+/g, " ").trim()

  const body = text.length > 0 ? text.slice(0, 4000) : FALLBACK_MESSAGE
  return {
    message: body,
    thinkIsTerminated: false,
    thinkIsTerminatedReason: "",
  }
}

export const CLOD_JSON_REPAIR_USER_PROMPT = [
  "Your previous reply was not parseable as the required JSON object.",
  "Output ONLY one JSON object (no markdown fences, no commentary) with exactly these keys:",
  '"message" (string, non-empty), "thinkIsTerminated" (boolean), "thinkIsTerminatedReason" (string),',
  'and optionally "toolRequest" with toolId, connectionId, and input as specified in the system prompt.',
  "If you do not need a tool, omit toolRequest entirely.",
].join(" ")

/**
 * Strict parse for tests and callers that require structured JSON (throws on failure).
 */
export function parseClodAgentResponse(value: unknown): ParsedClodAgentResponse {
  const structured = tryParseStructuredClodResponse(value)
  if (!structured) {
    throw new Error("Clod returned invalid JSON.")
  }
  return clodAgentResponseSchema.parse(structured)
}
