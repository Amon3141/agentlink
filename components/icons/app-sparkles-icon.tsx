import type { ComponentProps } from "react"
import { SparklesIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function AppSparklesIcon({
  className,
  ...props
}: ComponentProps<typeof SparklesIcon>) {
  return (
    <SparklesIcon
      className={cn("size-4.5 shrink-0 text-primary", className)}
      aria-hidden
      {...props}
    />
  )
}
