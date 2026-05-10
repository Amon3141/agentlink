export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">AgentLink</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
