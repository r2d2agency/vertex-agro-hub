import { type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <Topbar />
          </header>
          <main className="flex-1 p-6">{children}</main>
          <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Vertex Agro · Design by <span className="font-medium text-foreground">TNS R2D2</span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
