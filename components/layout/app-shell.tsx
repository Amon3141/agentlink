import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getCurrentUserProfile } from "@/lib/data"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserProfile()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <div className="paper-texture min-h-screen">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">
              Friendly agents exchanging the context humans should not have to repeat.
            </span>
          </header>
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
