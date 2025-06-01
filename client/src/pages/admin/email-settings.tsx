import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/layout/require-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1, "SMTP port must be a valid number").max(65535, "Invalid port number"),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  fromEmail: z.string().email("Valid email address is required"),
  fromName: z.string().min(1, "From name is required"),
  isEnabled: z.boolean(),
});

type EmailSettingsForm = z.infer<typeof emailSettingsSchema>;

export default function AdminEmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/email-settings"],
    queryFn: () => fetch("/api/admin/email-settings", { credentials: "include" }).then(res => res.json()),
  });

  const form = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      fromEmail: "",
      fromName: "OyeGaadi",
      isEnabled: false,
    },
  });

  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      form.reset({
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUsername: settings.smtpUsername || "",
        smtpPassword: settings.smtpPassword || "",
        fromEmail: settings.fromEmail || "",
        fromName: settings.fromName || "OyeGaadi",
        isEnabled: settings.isEnabled || false,
      });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: EmailSettingsForm) => apiRequest('POST', '/api/admin/email-settings', data),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Email settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update email settings.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (data: EmailSettingsForm) => apiRequest('POST', '/api/admin/email-settings/test', data),
    onSuccess: () => {
      setTestStatus('success');
      toast({
        title: "Connection Successful",
        description: "SMTP connection test passed successfully.",
      });
    },
    onError: (error: any) => {
      setTestStatus('error');
      toast({
        title: "Connection Failed",
        description: error.message || "SMTP connection test failed.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  const handleTestConnection = () => {
    const formData = form.getValues();
    setTestStatus('testing');
    testConnectionMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <RequireAuth allowedRoles={["admin"]}>
        <AdminLayout title="Email Settings">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </AdminLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="Email Settings">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Email Settings</h1>
            <p className="text-muted-foreground">
              Configure SMTP settings to enable email notifications for users.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure your email server settings. You can use Gmail, Hostinger, or any other SMTP provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpHost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Host</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.gmail.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Port</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="587" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Username</FormLabel>
                          <FormControl>
                            <Input placeholder="your-email@gmail.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="smtpPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Your app password" {...field} />
                          </FormControl>
                          <FormDescription>
                            For Gmail, use an App Password instead of your regular password.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email</FormLabel>
                          <FormControl>
                            <Input placeholder="noreply@oyegaadi.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Name</FormLabel>
                          <FormControl>
                            <Input placeholder="OyeGaadi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Email Notifications</FormLabel>
                          <FormDescription>
                            Turn on email notifications for user registration, bookings, and other events.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testConnectionMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {testStatus === 'testing' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : testStatus === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : testStatus === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateSettingsMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Email Types:</strong> Users will receive emails for registration confirmation, 
              ride booking notifications, cancellations, and ride published confirmations.
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    </RequireAuth>
  );
}