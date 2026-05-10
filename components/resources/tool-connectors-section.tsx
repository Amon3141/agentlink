"use client"

import { PlugIcon } from "lucide-react"

import { ProviderBrandIcon } from "@/components/icons/provider-brand-icon"
import type { ProviderConnectionCard } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { providerSlug, providerStatusLabel } from "@/components/resources/resource-utils"

function ProviderChip({ card }: { card: ProviderConnectionCard }) {
  const slug = providerSlug(card.provider)
  const connected = card.status === "connected" && card.connection
  const isInternal = card.provider === "internal"

  return (
    <div className="flex min-w-[13rem] flex-1 flex-col gap-3 rounded-2xl border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ProviderBrandIcon provider={card.provider} />
          <p className="mt-3 truncate text-sm font-medium">{card.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {connected ? `${card.tools.length} tool${card.tools.length === 1 ? "" : "s"}` : card.description}
          </p>
        </div>
        <Badge variant={connected ? "secondary" : "outline"} className="shrink-0">
          {providerStatusLabel(card.status)}
        </Badge>
      </div>
      {connected ? (
        isInternal ? (
          <p className="text-xs text-muted-foreground">
            Always available. Grant tools from agent settings.
          </p>
        ) : (
          <form action={`/api/resources/${slug}/disconnect`} method="post">
            <Button type="submit" variant="outline" size="sm">
              Disconnect
            </Button>
          </form>
        )
      ) : (
        <a
          className={buttonVariants({ variant: "secondary", size: "sm" })}
          aria-disabled={!card.configured}
          href={card.configured ? `/api/resources/${slug}/connect` : undefined}
        >
          {card.configured ? `Connect ${card.label}` : "Not configured"}
        </a>
      )}
    </div>
  )
}

export function ToolConnectorsSection({ providerCards }: { providerCards: ProviderConnectionCard[] }) {
  return (
    <section className="flex flex-col gap-3">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Connected tools</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          OAuth integrations for GitHub, Google, Slack, and more. Grant per-tool access when you edit an
          agent.
        </p>
      </header>
      <Card className="sketch-border bg-card/95">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted/50">
              <PlugIcon className="size-6 text-primary" aria-hidden />
            </span>
            <div>
              <CardTitle>Tool connectors</CardTitle>
              <CardDescription>
                Link accounts once here; choose which tools each agent may call from the agent editor.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {providerCards.map((card) => (
            <ProviderChip key={card.provider} card={card} />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
