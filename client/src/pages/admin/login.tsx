import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";

const loginSchema = z.object({
  mobile: z.string().min(1, "Mobile number or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobile: "",
      password: "",
    },
  });

  // Track login attempts with a counter
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  async function onSubmit(data: LoginFormValues) {
    // Check if account is temporarily locked due to too many failed attempts
    if (isLocked) {
      setError("Too many failed login attempts. Please try again later.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      console.log("Attempting admin login with mobile/email:", data.mobile);
      
      // Validate input before sending to server
      if (!data.mobile.trim() || !data.password.trim()) {
        throw new Error("Please enter both mobile number/email and password");
      }
      
      const res = await apiRequest("POST", "/api/auth/login", data);
      
      // More detailed error logging
      if (!res.ok) {
        console.error("Admin login failed with status:", res.status);
        
        // Increment login attempt counter
        const newAttemptCount = loginAttempts + 1;
        setLoginAttempts(newAttemptCount);
        
        // If too many failed attempts, lock the account temporarily
        if (newAttemptCount >= 5) {
          setIsLocked(true);
          // After 2 minutes, unlock the account
          setTimeout(() => {
            setIsLocked(false);
            setLoginAttempts(0);
          }, 2 * 60 * 1000); // 2 minutes lockout
        }
        
        let errorMessage = "Login failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }
      
      // Reset attempt counter on successful login
      setLoginAttempts(0);
      
      let userData;
      try {
        userData = await res.json();
        console.log("Login successful, user role:", userData.role);
      } catch (parseError) {
        console.error("Failed to parse user data:", parseError);
        throw new Error("Invalid response from server");
      }
      
      // Check if user is an admin
      if (userData.role !== "admin") {
        setError("You do not have permission to access the admin area.");
        setIsLoading(false);
        return;
      }
      
      // Login successful, store user info and handle redirect in login function
      login(userData);
      
      // Show success toast
      toast({
        title: "Login successful",
        description: "Welcome to OyeGaadi Admin Panel",
      });
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">OyeGaadi Admin</h1>
          <p className="text-gray-600 mt-2">Sign in to access the admin dashboard</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number or Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your mobile number or email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || isLocked}
                >
                  {isLoading ? "Signing in..." : isLocked ? "Account Temporarily Locked" : "Sign In"}
                </Button>
                
                {/* Account help text */}
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  <p>Forgot your password or having trouble logging in?</p>
                  <p className="mt-1">Contact <a href="mailto:support@oyegaadi.com" className="text-primary hover:underline">support@oyegaadi.com</a> for assistance.</p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}