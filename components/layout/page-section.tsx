import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PageSection({
  title,
  description,
  children,
  className,
  withGradient,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Match Resources section subtle corner wash */
  withGradient?: boolean
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border bg-muted/15 p-6",
        className
      )}
    >
      {withGradient ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0,transparent_38%)] opacity-50" />
      ) : null}
      <div className="relative z-1 flex flex-col gap-6">
        <header>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
        {children}
      </div>
    </section>
  )
}
