import { cn } from "@/lib/utils"

export function PaperSurface({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("sketch-border rounded-3xl bg-card/92 p-5 backdrop-blur", className)}
      {...props}
    />
  )
}
