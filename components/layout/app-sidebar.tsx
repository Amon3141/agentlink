"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BotIcon,
  CalendarHeartIcon,
  HeartHandshakeIcon,
  HomeIcon,
  LogOutIcon,
  MessageSquareIcon,
} from "lucide-react"

import { AppSparklesIcon } from "@/components/icons/app-sparkles-icon"
import type { FriendProfile } from "@/lib/types"
import { signOut } from "@/lib/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/", icon: HomeIcon },
  { title: "My Agents", href: "/agents", icon: BotIcon },
  { title: "Resources", href: "/resources", icon: CalendarHeartIcon },
  { title: "Friends", href: "/friends", icon: HeartHandshakeIcon },
  { title: "Conversations", href: "/conversations", icon: MessageSquareIcon },
]

function initialsFor(user: FriendProfile) {
  const source = user.username?.trim() || user.email || "?"
  return source.slice(0, 2).toUpperCase()
}

export function AppSidebar({ user }: { user: FriendProfile }) {
  const pathname = usePathname()

  return (
    <Sidebar
      className="border-r border-sidebar-border/80 bg-sidebar"
      collapsible="offcanvas"
    >
      <SidebarHeader className="border-b border-sidebar-border/60 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-2 py-1.5 transition-colors hover:bg-sidebar-accent/40"
        >
          <span className="flex size-9 shrink-0 items-center justify-center bg-primary/10">
            <AppSparklesIcon />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold leading-tight">AgentLink</span>
            <span className="text-xs text-muted-foreground">Context for friends</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className={cn(isActive && "bg-sidebar-accent font-medium")}
                    >
                      <item.icon className="shrink-0" aria-hidden />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <div className="sketch-border rounded-2xl border border-sidebar-border/60 bg-card/60 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0 rounded-xl border border-border/50 bg-background">
              <AvatarImage src={user.avatar_url ?? undefined} alt={user.username} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-medium text-primary">
                {initialsFor(user)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight" title={user.username}>
                {user.username}
              </p>
              {user.email ? (
                <p className="truncate text-xs text-muted-foreground" title={user.email}>
                  {user.email}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {user.id === "demo-user" ? "Local preview" : "Signed in"}
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-sidebar-border/60" />

        <form action={signOut} className="flex flex-col gap-2">
          <p className="text-xs leading-snug text-muted-foreground">
            Warm, useful, and context-aware.
          </p>
          <Button type="submit" variant="outline" size="sm" className="sketch-border w-full gap-2">
            <LogOutIcon data-icon="inline-start" className="size-4" />
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
