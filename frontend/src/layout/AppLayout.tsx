import { NavLink, Outlet } from "react-router-dom";
import { Menu, Home, Settings, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <NavLink to="/" className="text-lg font-semibold">
              CoveStack
            </NavLink>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>NK</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild>
                  <a href="https://github.com/NishithaKhasnavis/CoveStack" target="_blank">
                    GitHub
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/settings">Settings</a>
                </DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content with left nav (desktop) */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <nav className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <Home className="h-4 w-4" />
              Home
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>

            <Button asChild className="mt-4 w-full">
              <NavLink to="/">
                <Plus className="mr-2 h-4 w-4" />
                New Cove
              </NavLink>
            </Button>
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CoveStack
      </footer>
    </div>
  );
}
