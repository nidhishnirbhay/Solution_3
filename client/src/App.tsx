import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { AuthProvider } from "./contexts/auth-context";

// Pages
import Home from "@/pages/home";
import FindRides from "@/pages/find-rides";
import PublishRide from "@/pages/publish-ride";
import MyBookings from "@/pages/my-bookings";
import MyPublishedRides from "@/pages/my-published-rides";
import KycVerification from "@/pages/kyc-verification";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminKYC from "@/pages/admin/kyc";
import AdminUsers from "@/pages/admin/users";
import AdminRides from "@/pages/admin/rides";
import AdminBookings from "@/pages/admin/bookings";
import AdminSettings from "@/pages/admin/settings";
import AdminLogin from "@/pages/admin/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { toast } = useToast();
  
  // Global error handler for React Query
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'error' && event.query.state.error) {
        const error = event.query.state.error as Error;
        toast({
          title: "Error",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [toast]);

  return (
    <AuthProvider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/find-rides" component={FindRides} />
        <Route path="/publish-ride" component={PublishRide} />
        <Route path="/my-bookings" component={MyBookings} />
        <Route path="/my-published-rides" component={MyPublishedRides} />
        <Route path="/kyc-verification" component={KycVerification} />
        
        {/* Admin routes */}
        <Route path="/admin" component={() => {
          // Redirect root admin path to dashboard
          window.location.href = "/admin/dashboard";
          return null;
        }} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/kyc" component={AdminKYC} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/rides" component={AdminRides} />
        <Route path="/admin/bookings" component={AdminBookings} />
        <Route path="/admin/settings" component={AdminSettings} />
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
