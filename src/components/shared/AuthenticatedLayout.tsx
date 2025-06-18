
"use client";

import type React from 'react';
import { useEffect }
from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/components/shared/AppLogo";
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, LogOut, UserCircle, LayoutDashboard, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userRole: 'patient' | 'admin'; 
}

export function AuthenticatedLayout({ children, navItems, userRole }: AuthenticatedLayoutProps) {
  const { user, role, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login'); // All users (admin or patient) redirect to /login if not authenticated
    }
    // Check if the role matches the expected role for this layout
    if (!loading && user && role !== userRole) {
      signOut(); 
      router.push('/'); 
    }
  }, [user, role, loading, router, userRole, signOut]);

  if (loading || !user || role !== userRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4 border-b">
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    className="w-full justify-start"
                    tooltip={item.label}
                    disabled={item.disabled}
                    isActive={router.pathname === item.href}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          {/* Footer content if any, or remove */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-6">
            <SidebarTrigger className="md:hidden" /> 
            <div className="flex-1">
              {/* Optional: Breadcrumbs or page title here */}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user?.displayName || user?.email}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{user?.displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={userRole === 'admin' ? "/admin/profile" : "/app/profile"}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userRole === 'admin' ? "/admin/settings" : "/app/settings"}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
