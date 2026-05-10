"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BotIcon,
  CalendarHeartIcon,
  HeartHandshakeIcon,
  HomeIcon,
  MessageCircleHeartIcon,
  LogOutIcon,
  SparklesIcon,
} from "lucide-react"
import { signOut } from "@/lib/actions"
import { Button } from "@/components/ui/button"
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

const navItems = [
  { title: "Dashboard", href: "/", icon: HomeIcon },
  { title: "My Agents", href: "/agents", icon: BotIcon },
  { title: "Resources", href: "/resources", icon: CalendarHeartIcon },
  { title: "Friends", href: "/friends", icon: HeartHandshakeIcon },
  { title: "Conversations", href: "/conversations", icon: MessageCircleHeartIcon },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-sidebar-border/80">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3 rounded-2xl bg-accent p-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-card sketch-border">
            <SparklesIcon />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">AgentLink</span>
            <span className="text-xs text-muted-foreground">context friends</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    }
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 text-xs text-muted-foreground">
        <form action={signOut} className="flex flex-col gap-2">
          <span>Warm, useful, and always context-aware.</span>
          <Button type="submit" variant="outline" size="sm">
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
