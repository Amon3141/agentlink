"use client"

import { PlugIcon } from "lucide-react"

import { ProviderBrandIcon } from "@/components/icons/provider-brand-icon"
import type { ProviderConnectionCard } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { providerSlug, providerStatusLabel } from "@/components/resources/resource-utils"
import { cn } from "@/lib/utils"

function ProviderChip({ card }: { card: ProviderConnectionCard }) {
  const slug = providerSlug(card.provider)
  const connected = card.status === "connected" && card.connection

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
        <form action={`/api/resources/${slug}/disconnect`} method="post">
          <Button type="submit" variant="outline" size="sm">
            Disconnect
          </Button>
        </form>
      ) : card.configured ? (
        <a
          className={buttonVariants({ variant: "secondary", size: "sm" })}
          href={`/api/resources/${slug}/connect`}
        >
          {`Connect ${card.label}`}
        </a>
      ) : (
        <Dialog>
          <DialogTrigger render={<Button type="button" variant="secondary" size="sm" />}>
            {`Connect ${card.label}`}
          </DialogTrigger>
          <DialogContent
            showCloseButton
            className={cn(
              "sketch-border max-w-[calc(100%-2rem)] rounded-2xl bg-card/95 p-6 sm:max-w-md",
              "gap-5 ring-1 ring-foreground/10"
            )}
          >
            <DialogHeader className="gap-3 text-left">
              <DialogTitle className="text-base leading-snug">
                {card.label} is not available on this deployment yet
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                OAuth connectors are still being wired up for this environment. The feature is coming soon. In the
                meantime, built-in AgentLink scheduling tools are provisioned automatically for signed-in accounts.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="-mx-6 -mb-6 mt-0 border-t border-border/60 bg-muted/40 px-6 py-4 sm:justify-end">
              <DialogClose
                render={<Button type="button" variant="secondary" className="w-full sm:w-auto" />}
              >
                Got it
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          {providerCards
            .filter((card) => card.provider !== "internal")
            .map((card) => (
              <ProviderChip key={card.provider} card={card} />
            ))}
        </CardContent>
      </Card>
    </section>
  )
}
