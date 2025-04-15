import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireKyc?: boolean;
}

export function RequireAuth({ 
  children, 
  allowedRoles = ["admin", "driver", "customer"],
  requireKyc = false,
}: RequireAuthProps) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      // Not authenticated
      if (!user) {
        const returnPath = encodeURIComponent(location);
        navigate(`/?redirectTo=${returnPath}`);
        return;
      }

      // Check role permissions
      if (!allowedRoles.includes(user.role)) {
        navigate("/");
        return;
      }

      // Check KYC verification if required
      if (requireKyc && !user.isKycVerified) {
        navigate("/kyc-verification");
        return;
      }
    }
  }, [user, loading, allowedRoles, requireKyc, location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Authentication Required</h1>
              <p className="text-muted-foreground">
                Please log in to access this page.
              </p>
              <Button onClick={() => navigate("/")} className="mt-4">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
              <Button onClick={() => navigate("/")} className="mt-4">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireKyc && !user.isKycVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">KYC Verification Required</h1>
              <p className="text-muted-foreground">
                You need to complete KYC verification to access this feature.
              </p>
              <Button onClick={() => navigate("/kyc-verification")} className="mt-4">
                Complete KYC
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
