import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookCopy, Users, ClipboardList, Clock, Receipt, Library, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const librarianNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/books", label: "Book Inventory", icon: BookCopy },
  { href: "/students", label: "Student Details", icon: Users },
  { href: "/loans", label: "Transaction Details", icon: ClipboardList },
  { href: "/reservations", label: "Reservations", icon: Clock },
  { href: "/fines", label: "Fines", icon: Receipt },
  { href: "/catalog", label: "Student Catalog", icon: Library },
];

const studentNavItems = [
  { href: "/catalog", label: "Book Catalog", icon: Library },
  { href: "/my-account", label: "My Account", icon: User },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = user?.role === "librarian" ? librarianNavItems : studentNavItems;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <Sidebar className="border-r border-border/50">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50">
            <div className="font-semibold text-lg text-primary flex items-center gap-2">
              <Library className="h-5 w-5" />
              <span>Alexandria</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>
                {user?.role === "librarian" ? "Library Management" : "Student Portal"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border/50 p-3 space-y-1">
            <div className="px-2 py-1">
              <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
