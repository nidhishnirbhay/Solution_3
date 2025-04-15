import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Car, 
  FileCheck, 
  LogOut, 
  Home, 
  Menu, 
  X, 
  BookText 
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user || user.role !== "admin") {
    // Redirect to admin login if not logged in as admin
    navigate("/admin/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await apiRequest("GET", "/api/auth/logout");
      logout();
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <Home className="mr-2 h-4 w-4" /> },
    { href: "/admin/users", label: "Users", icon: <Users className="mr-2 h-4 w-4" /> },
    { href: "/admin/rides", label: "Rides", icon: <Car className="mr-2 h-4 w-4" /> },
    { href: "/admin/bookings", label: "Bookings", icon: <BookText className="mr-2 h-4 w-4" /> },
    { href: "/admin/kyc", label: "KYC Verifications", icon: <FileCheck className="mr-2 h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navbar */}
      <header className="bg-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col h-full">
                  <div className="py-4 border-b">
                    <div className="flex items-center justify-between px-4">
                      <h2 className="text-lg font-bold text-primary">OyeGaadi Admin</h2>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <X className="h-5 w-5" />
                        </Button>
                      </SheetTrigger>
                    </div>
                  </div>
                  <nav className="flex-1 py-4">
                    <div className="space-y-1 px-2">
                      {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                          <a
                            className={`flex items-center rounded-md px-3 py-2 text-sm ${
                              location === item.href
                                ? "bg-primary text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {item.icon}
                            {item.label}
                          </a>
                        </Link>
                      ))}
                    </div>
                  </nav>
                  <div className="border-t py-4 px-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/admin/dashboard">
              <a className="ml-2 md:ml-0 font-bold text-xl text-primary">OyeGaadi Admin</a>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden md:block text-sm font-medium">
              {user.fullName}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <div className="flex">
        <aside className="hidden md:block w-64 bg-white border-r min-h-[calc(100vh-4rem)]">
          <nav className="p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center rounded-md px-3 py-2 text-sm ${
                      location === item.href
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}