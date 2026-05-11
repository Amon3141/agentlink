import { z } from "zod"

export const dayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])

export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24-hour time.")

export const focusBlockSchema = z.object({
  label: z.string().trim().min(1).max(120),
  days: z.array(dayOfWeekSchema).min(1),
  start: timeOfDaySchema,
  end: timeOfDaySchema,
})

export const availabilityPolicyConfigSchema = z.object({
  preferredDays: z.array(dayOfWeekSchema).default([]),
  preferredStart: timeOfDaySchema.optional(),
  preferredEnd: timeOfDaySchema.optional(),
  defaultDurationMinutes: z.coerce.number().int().min(15).max(240).default(30),
  bufferMinutes: z.coerce.number().int().min(0).max(120).default(15),
  focusBlocks: z.array(focusBlockSchema).default([]),
  workPreference: z.string().trim().max(800).default(""),
  socialPreference: z.string().trim().max(800).default(""),
  notes: z.string().trim().max(1600).default(""),
})

export const softHoldCalendarConfigSchema = z.object({
  timezone: z.string().trim().min(1).max(80).default("local"),
  defaultDurationMinutes: z.coerce.number().int().min(15).max(240).default(30),
  notes: z.string().trim().max(1000).default(""),
})

export const sharingRulesConfigSchema = z.object({
  audience: z.string().trim().max(160).default("Accepted friends"),
  rules: z.string().trim().max(1600).default(""),
})

export const softHoldInputSchema = z.object({
  resourceId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  start: z.string().datetime(),
  end: z.string().datetime(),
  notes: z.string().trim().max(1000).optional(),
})

export const softHoldWindowSchema = z.object({
  resourceId: z.string().uuid(),
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export type AvailabilityPolicyConfig = z.infer<typeof availabilityPolicyConfigSchema>
export type SoftHoldCalendarConfig = z.infer<typeof softHoldCalendarConfigSchema>
export type SharingRulesConfig = z.infer<typeof sharingRulesConfigSchema>
