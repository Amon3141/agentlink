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

export function parseClodAgentResponse(value: unknown): ParsedClodAgentResponse {
  const parsedValue = typeof value === "string" ? parseJsonString(value) : value
  const parsed = clodAgentResponseSchema.safeParse(parsedValue)

  if (!parsed.success) {
    throw new Error("Clod returned malformed JSON.")
  }

  return parsed.data
}

function parseJsonString(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error("Clod returned invalid JSON.")
  }
}
