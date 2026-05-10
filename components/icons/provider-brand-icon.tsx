import { siGithub, siGmail, siGooglecalendar } from "simple-icons"

import { AppSparklesIcon } from "@/components/icons/app-sparkles-icon"
import type { McpProvider } from "@/lib/types"
import { cn } from "@/lib/utils"

const brands = {
  github: siGithub,
  google_calendar: siGooglecalendar,
  gmail: siGmail,
} as const

/** Slack was removed from the simple-icons npm package; keep brand-accurate geometry (community SVG). */
const slackBrand = {
  hex: "4A154B",
  path:
    "M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834V5.042zm0 1.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.876a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.876a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.876zm-1.313 1.313a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.652 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.652 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zm0-1.313a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z",
} as const

export function ProviderBrandIcon({
  provider,
  className,
  size = 28,
}: {
  provider: McpProvider
  className?: string
  /** Pixel width/height */
  size?: number
}) {
  if (provider === "internal") {
    return (
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 sketch-border",
          className
        )}
      >
        <AppSparklesIcon className="size-5" />
      </span>
    )
  }

  if (provider === "slack") {
    return (
      <span className={cn("flex size-10 shrink-0 items-center justify-center", className)}>
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className="shrink-0"
          aria-hidden
          role="presentation"
        >
          <path fill={`#${slackBrand.hex}`} d={slackBrand.path} />
        </svg>
      </span>
    )
  }

  const icon = brands[provider as keyof typeof brands]
  if (!icon) {
    return null
  }

  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center", className)}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="shrink-0"
        aria-hidden
        role="presentation"
      >
        <path fill={`#${icon.hex}`} d={icon.path} />
      </svg>
    </span>
  )
}
