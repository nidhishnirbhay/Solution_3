import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/ui/auth-modal";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const openAuthModal = () => {
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  // Get user's initials for the avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Navigation links based on user role
  const getNavLinks = () => {
    const commonLinks = [
      { path: "/", label: "Home" },
      { path: "/find-rides", label: "Find Rides" },
    ];

    // Links for driver
    if (user && user.role === "driver") {
      return [
        ...commonLinks,
        { path: "/publish-ride", label: "Publish Ride" },
        { path: "/my-published-rides", label: "My Rides" },
        { path: "/my-bookings", label: "My Bookings" },
      ];
    }
    
    // Links for customer
    if (user && user.role === "customer") {
      return [
        ...commonLinks,
        { path: "/my-bookings", label: "My Bookings" },
      ];
    }
    
    // Links for admin
    if (user && user.role === "admin") {
      return [
        { path: "/admin", label: "Dashboard" },
        { path: "/admin/users", label: "Manage Users" },
        { path: "/admin/rides", label: "Manage Rides" },
        { path: "/admin/kyc", label: "KYC Verification" },
      ];
    }
    
    // Default links for guests
    return commonLinks;
  };

  const navLinks = getNavLinks();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center">
                <span className="text-2xl font-bold text-primary">
                  Oye<span className="text-blue-500">Gaadi</span>
                </span>
              </a>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6">
            {navLinks.map((link) => (
              <Link key={link.path} href={link.path}>
                <a
                  className={`text-neutral-700 hover:text-primary font-medium text-sm py-2 ${
                    location === link.path ? "text-primary" : ""
                  }`}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </nav>

          {/* User Menu or Auth Button */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{user.fullName}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={user.fullName} />
                        <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role === "admin" ? (
                      <DropdownMenuItem>
                        <Link href="/admin">
                          <a className="w-full">Admin Dashboard</a>
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem>
                          <Link href="/my-bookings">
                            <a className="w-full">My Bookings</a>
                          </Link>
                        </DropdownMenuItem>
                        {user.role === "driver" && (
                          <>
                            <DropdownMenuItem>
                              <Link href="/publish-ride">
                                <a className="w-full">Publish Ride</a>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href="/my-published-rides">
                                <a className="w-full">My Rides</a>
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                    <DropdownMenuItem>
                      <Link href="/kyc-verification">
                        <a className="w-full">KYC Verification</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:block">
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={openAuthModal}
                >
                  Login / Register
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 border-t mt-2">
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link key={link.path} href={link.path}>
                  <a
                    className={`block py-2 text-neutral-700 hover:text-primary ${
                      location === link.path ? "text-primary" : ""
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </Link>
              ))}
              
              {user ? (
                <>
                  {/* Only show for customers and drivers */}
                  {user.role !== "admin" && (
                    <Link href="/my-bookings">
                      <a
                        className="block py-2 text-neutral-700 hover:text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Bookings
                      </a>
                    </Link>
                  )}
                  
                  {/* Only show for driver */}
                  {user.role === "driver" && (
                    <>
                      <Link href="/publish-ride">
                        <a
                          className="block py-2 text-neutral-700 hover:text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Publish Ride
                        </a>
                      </Link>
                      <Link href="/my-published-rides">
                        <a
                          className="block py-2 text-neutral-700 hover:text-primary"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Rides
                        </a>
                      </Link>
                    </>
                  )}
                  
                  {/* Show for all users */}
                  <Link href="/kyc-verification">
                    <a
                      className="block py-2 text-neutral-700 hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      KYC Verification
                    </a>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full mt-2 bg-primary hover:bg-primary/90 text-white"
                  onClick={openAuthModal}
                >
                  Login / Register
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </header>
  );
}
