import Link from "next/link"
import { BotIcon, LockIcon, UsersIcon } from "lucide-react"
import type { Agent } from "@/lib/types"
import { AppSparklesIcon } from "@/components/icons/app-sparkles-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AgentCard({
  agent,
  href,
  compact,
}: {
  agent: Agent
  href?: string
  compact?: boolean
}) {
  const card = (
    <Card className={cn("sketch-border overflow-hidden bg-card/95 transition-transform hover:-rotate-1 hover:scale-[1.01]", compact && "shadow-none")}>
      <CardHeader className="relative">
        <div className="absolute right-4 top-4">
          <Badge variant={agent.is_public ? "secondary" : "outline"}>
            {agent.is_public ? <UsersIcon data-icon="inline-start" /> : <LockIcon data-icon="inline-start" />}
            {agent.is_public ? "Public" : "Private"}
          </Badge>
        </div>
        <Avatar className="size-20 rounded-3xl border bg-accent">
          <AvatarImage src={agent.avatar_url ?? undefined} alt={agent.name} />
          <AvatarFallback className="rounded-3xl bg-accent text-2xl">
            <BotIcon />
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl">{agent.name}</CardTitle>
        <CardDescription>{agent.role}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">{agent.system_prompt}</p>
      </CardContent>
      <CardFooter className="gap-2.5 text-xs text-muted-foreground">
        <AppSparklesIcon />
        <span>Ready to exchange context</span>
      </CardFooter>
    </Card>
  )

  return href ? <Link href={href}>{card}</Link> : card
}
