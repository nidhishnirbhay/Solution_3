import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { SuspendedAccountModal } from "@/components/ui/suspended-account-modal";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "driver" | "customer";
  isKycVerified: boolean;
  mobile?: string;
  averageRating?: number;
  isSuspended?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
  isSuspendedModalOpen: boolean;
  closeSuspendedModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const closeSuspendedModal = () => {
    setIsSuspendedModalOpen(false);
  };

  useEffect(() => {
    // Check for existing session on mount
    async function fetchCurrentUser() {
      try {
        setLoading(true);
        const response = await fetch("/api/auth/current-user", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Check if the account is suspended
          const data = await response.json();
          if (response.status === 403 && data.error === "Account suspended") {
            setIsSuspendedModalOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCurrentUser();
  }, []);

  const login = (userData: User) => {
    // Check if user is suspended
    if (userData.isSuspended) {
      setIsSuspendedModalOpen(true);
      return;
    }
    
    setUser(userData);
    
    // Navigate based on user role
    if (userData.role === "admin") {
      navigate("/admin");
    }
  };

  const logout = async () => {
    try {
      await apiRequest("GET", "/api/auth/logout", undefined);
      setUser(null);
      navigate("/");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: "There was an error during logout",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      isSuspendedModalOpen,
      closeSuspendedModal
    }}>
      <SuspendedAccountModal 
        isOpen={isSuspendedModalOpen} 
        onClose={closeSuspendedModal} 
      />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}