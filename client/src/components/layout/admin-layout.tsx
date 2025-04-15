import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import {
  PanelsTopLeft,
  Users,
  Car,
  FileCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex flex-col flex-grow bg-sidebar pt-5 overflow-y-auto border-r border-sidebar-border">
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex-grow flex flex-col px-2 space-y-1">
              {Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col flex-1 md:pl-64">
          <div className="sticky top-0 z-10 flex-shrink-0 h-16 bg-white shadow">
            <div className="flex items-center justify-between px-4 h-full">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
          <main className="flex-1 p-6">
            <div className="mb-6">
              <Skeleton className="h-10 w-40 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-40 w-full" />
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6">You don't have permission to access the admin area.</p>
          <Link href="/">
            <Button>Return to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const navItems = [
    {
      name: "PanelsTopLeft",
      href: "/admin",
      icon: <PanelsTopLeft className="h-5 w-5" />,
    },
    {
      name: "Manage Users",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Manage Rides",
      href: "/admin/rides",
      icon: <Car className="h-5 w-5" />,
    },
    {
      name: "KYC Verification",
      href: "/admin/kyc",
      icon: <FileCheck className="h-5 w-5" />,
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-sidebar pt-5 overflow-y-auto border-r border-sidebar-border">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <Link href="/">
              <span className="text-xl font-bold text-sidebar-primary">
                Oye<span className="text-sidebar-accent">Gaadi</span> Admin
              </span>
            </Link>
          </div>
          <div className="flex-grow flex flex-col px-2 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Button>
              </Link>
            ))}
            <div className="pt-6 mt-6 border-t border-sidebar-border">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-3">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex-shrink-0 h-16 bg-white shadow">
          <div className="flex items-center justify-between px-4 h-full">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <h1 className="text-xl font-bold text-primary md:hidden">OyeGaadi Admin</h1>
            </div>
            {user && (
              <div className="text-right">
                <span className="font-medium">{user.fullName}</span>
              </div>
            )}
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-2 pb-3 border-t">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Button>
                </Link>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-3">Logout</span>
              </Button>
            </div>
          )}
        </div>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">
              Manage and monitor {title.toLowerCase()} in the OyeGaadi system
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
