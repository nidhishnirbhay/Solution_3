import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required" }),
  email: z.string().email({ message: "Valid email address is required" }),
  mobile: z.string().min(10, { message: "Valid mobile number is required" }),
  username: z.string().min(4, { message: "Username must be at least 4 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["customer", "driver"], { message: "Please select role" }),
  termsAgreement: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  // Login Form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register Form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
      username: "",
      password: "",
      role: "customer",
      termsAgreement: false,
    },
  });

  // Reset forms when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      loginForm.reset();
      registerForm.reset();
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab, loginForm, registerForm]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      console.log("User login attempt for:", data.username);
      
      // Client-side validation
      if (!data.username.trim()) {
        throw new Error("Username is required");
      }
      
      if (!data.password.trim()) {
        throw new Error("Password is required");
      }
      
      try {
        const res = await apiRequest("POST", "/api/auth/login", {
          username: data.username,
          password: data.password,
        });
        
        if (!res.ok) {
          // Attempt to extract detailed error message
          const errorData = await res.json();
          
          // Special handling for suspended accounts
          if (res.status === 403 && errorData.error === "Account suspended") {
            throw new Error("Your account has been suspended. Please contact support.");
          }
          
          throw new Error(errorData.error || errorData.message || "Login failed. Please check your credentials.");
        }
        
        return res.json();
      } catch (error) {
        console.error("Login request error:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Login failed. Please try again later.");
        }
      }
    },
    onSuccess: (data) => {
      console.log("Login successful for user:", data.username);
      login(data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.fullName}!`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Login error in mutation:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      console.log("User registration attempt for:", data.username);
      
      // Client-side validation
      if (!data.username.trim()) {
        throw new Error("Username is required");
      }
      
      if (!data.password.trim()) {
        throw new Error("Password is required");
      }
      
      if (!data.fullName.trim()) {
        throw new Error("Full name is required");
      }
      
      if (!data.mobile.trim()) {
        throw new Error("Mobile number is required");
      }
      
      if (!data.termsAgreement) {
        throw new Error("You must agree to the terms and conditions");
      }
      
      try {
        // Remove terms agreement field as it's not needed in the API
        const { termsAgreement, ...userData } = data;
        
        const res = await apiRequest("POST", "/api/auth/register", userData);
        
        if (!res.ok) {
          // Attempt to extract detailed error message
          const errorData = await res.json();
          console.error("Registration error response:", errorData);
          throw new Error(errorData.error || errorData.message || "Registration failed. Please try again.");
        }
        
        return res.json();
      } catch (error) {
        console.error("Registration request error:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Registration failed. Please try again later.");
        }
      }
    },
    onSuccess: (data) => {
      console.log("Registration successful for user:", data.username);
      login(data);
      toast({
        title: "Registration successful",
        description: `Welcome to OyeGaadi, ${data.fullName}!`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Registration error in mutation:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div>
      <AlertDialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forgot Password</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                To reset your password, please contact the administrator at:
              </p>
              <p className="font-medium text-primary mb-2">
                support@oyegaadi.com
              </p>
              <p className="font-medium text-primary">
                or call 08069640595
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="relative">
            <DialogTitle className="text-xl font-semibold">
              {activeTab === "login" ? "Login to OyeGaadi" : "Create an Account"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm cursor-pointer">
                            Remember me
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <Button 
                      variant="link" 
                      size="sm" 
                      className="px-0"
                      onClick={() => setForgotPasswordOpen(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0"
                    onClick={() => setActiveTab("register")}
                  >
                    Register now
                  </Button>
                </p>
              </div>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Enter your mobile number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="driver">Fleet Operator / Driver</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="termsAgreement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm cursor-pointer">
                            I agree to OyeGaadi's <a href="#" className="text-primary">Terms</a> and <a href="#" className="text-primary">Privacy Policy</a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Register"}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0"
                    onClick={() => setActiveTab("login")}
                  >
                    Login now
                  </Button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}