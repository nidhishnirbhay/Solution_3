import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Check, X, AlertTriangle, Loader2, Shield, Eye, EyeOff, BarChart3, MessageCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BookingFeeSettings {
  enabled: boolean;
  amount: number;
}

interface GTMSettings {
  enabled: boolean;
  containerId: string;
}

interface WhatsAppSettings {
  enabled: boolean;
  phoneNumber: string;
  message: string;
  position: 'bottom-right' | 'bottom-left';
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API calls
  const { data: bookingFeeSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/admin/settings/booking-fee'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/admin/settings/booking-fee');
      return await response.json();
    }
  });

  const { data: gtmSettings, isLoading: isLoadingGTM } = useQuery({
    queryKey: ['/api/admin/settings/gtm'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/admin/settings/gtm');
      return await response.json();
    }
  });

  const { data: whatsappSettings, isLoading: isLoadingWhatsApp } = useQuery({
    queryKey: ['/api/admin/settings/whatsapp'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/admin/settings/whatsapp');
      return await response.json();
    }
  });

  const updateBookingFeeMutation = useMutation({
    mutationFn: async (data: BookingFeeSettings) => {
      const response = await apiRequest("PATCH", '/api/admin/settings/booking-fee', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'The booking fee settings have been updated.',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/booking-fee'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update booking fee settings. Please try again.',
        variant: 'destructive'
      });
      console.error('Error updating booking fee settings:', error);
    }
  });

  const updateGTMMutation = useMutation({
    mutationFn: async (data: GTMSettings) => {
      const response = await apiRequest("PATCH", '/api/admin/settings/gtm', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'GTM Settings updated',
        description: 'Google Tag Manager settings have been updated.',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/gtm'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update GTM settings. Please try again.',
        variant: 'destructive'
      });
      console.error('Error updating GTM settings:', error);
    }
  });

  const updateWhatsAppMutation = useMutation({
    mutationFn: async (data: WhatsAppSettings) => {
      const response = await apiRequest("PATCH", '/api/admin/settings/whatsapp', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'WhatsApp Settings updated',
        description: 'WhatsApp widget settings have been updated.',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/whatsapp'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update WhatsApp settings. Please try again.',
        variant: 'destructive'
      });
      console.error('Error updating WhatsApp settings:', error);
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", '/api/admin/change-password', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
        variant: 'default'
      });
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive'
      });
      console.error('Error updating password:', error);
    }
  });

  // Form state
  const [enabled, setEnabled] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('200');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // GTM Form state
  const [gtmEnabled, setGtmEnabled] = useState<boolean>(false);
  const [gtmContainerId, setGtmContainerId] = useState<string>('');
  const [hasUnsavedGTMChanges, setHasUnsavedGTMChanges] = useState<boolean>(false);
  
  // WhatsApp Form state
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [whatsappMessage, setWhatsappMessage] = useState<string>('Hi! How can we help you?');
  const [whatsappPosition, setWhatsappPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [hasUnsavedWhatsAppChanges, setHasUnsavedWhatsAppChanges] = useState<boolean>(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Update form state when data is loaded
  useEffect(() => {
    if (bookingFeeSettings) {
      setEnabled(bookingFeeSettings.enabled);
      setAmount(bookingFeeSettings.amount.toString());
      setHasUnsavedChanges(false);
    }
  }, [bookingFeeSettings]);
  
  useEffect(() => {
    if (gtmSettings) {
      setGtmEnabled(gtmSettings.enabled);
      setGtmContainerId(gtmSettings.containerId);
      setHasUnsavedGTMChanges(false);
    }
  }, [gtmSettings]);
  
  useEffect(() => {
    if (whatsappSettings) {
      setWhatsappEnabled(whatsappSettings.enabled);
      setWhatsappPhone(whatsappSettings.phoneNumber);
      setWhatsappMessage(whatsappSettings.message);
      setWhatsappPosition(whatsappSettings.position);
      setHasUnsavedWhatsAppChanges(false);
    }
  }, [whatsappSettings]);

  // Handle form changes
  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    setHasUnsavedChanges(true);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setHasUnsavedChanges(true);
  };
  
  // GTM form handlers
  const handleGTMEnabledChange = (checked: boolean) => {
    setGtmEnabled(checked);
    setHasUnsavedGTMChanges(true);
  };
  
  const handleGTMContainerIdChange = (value: string) => {
    setGtmContainerId(value);
    setHasUnsavedGTMChanges(true);
  };
  
  // WhatsApp form handlers
  const handleWhatsAppEnabledChange = (checked: boolean) => {
    setWhatsappEnabled(checked);
    setHasUnsavedWhatsAppChanges(true);
  };
  
  const handleWhatsAppPhoneChange = (value: string) => {
    setWhatsappPhone(value);
    setHasUnsavedWhatsAppChanges(true);
  };
  
  const handleWhatsAppMessageChange = (value: string) => {
    setWhatsappMessage(value);
    setHasUnsavedWhatsAppChanges(true);
  };
  
  const handleWhatsAppPositionChange = (value: 'bottom-right' | 'bottom-left') => {
    setWhatsappPosition(value);
    setHasUnsavedWhatsAppChanges(true);
  };

  // Handle form submission
  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast({
        title: 'Invalid amount',
        description: 'The booking fee amount must be a positive number.',
        variant: 'destructive'
      });
      return;
    }

    updateBookingFeeMutation.mutate({
      enabled,
      amount: parsedAmount
    });
  };
  
  // Handle GTM form submission
  const handleGTMSave = () => {
    if (gtmEnabled && (!gtmContainerId.trim() || !gtmContainerId.startsWith('GTM-'))) {
      toast({
        title: 'Invalid GTM Container ID',
        description: 'Please enter a valid GTM Container ID (e.g., GTM-XXXXXXX).',
        variant: 'destructive'
      });
      return;
    }

    updateGTMMutation.mutate({
      enabled: gtmEnabled,
      containerId: gtmContainerId.trim()
    });
  };
  
  // Handle WhatsApp form submission
  const handleWhatsAppSave = () => {
    if (whatsappEnabled && !whatsappPhone.trim()) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a WhatsApp phone number.',
        variant: 'destructive'
      });
      return;
    }
    
    if (whatsappEnabled && whatsappPhone && !/^\+?[1-9]\d{1,14}$/.test(whatsappPhone.replace(/\s/g, ''))) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number with country code.',
        variant: 'destructive'
      });
      return;
    }

    updateWhatsAppMutation.mutate({
      enabled: whatsappEnabled,
      phoneNumber: whatsappPhone.trim(),
      message: whatsappMessage.trim() || 'Hi! How can we help you?',
      position: whatsappPosition
    });
  };

  // Handle password change
  const handlePasswordChange = () => {
    // Validation
    if (!currentPassword.trim()) {
      toast({
        title: 'Current password required',
        description: 'Please enter your current password.',
        variant: 'destructive'
      });
      return;
    }

    if (!newPassword.trim()) {
      toast({
        title: 'New password required',
        description: 'Please enter a new password.',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation password must match.',
        variant: 'destructive'
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: 'Same password',
        description: 'New password must be different from current password.',
        variant: 'destructive'
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 p-6">
        <div>
          <h3 className="text-lg font-medium">Application Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage the application-wide settings for OyeGaadi.
          </p>
        </div>
        <Separator />
        
        <div className="max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Booking Fee</CardTitle>
              <CardDescription>
                Configure the booking fee applied to each ride booking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading settings...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="booking-fee-enabled">Enable Booking Fee</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, a booking fee will be charged for each ride booking.
                      </p>
                    </div>
                    <Switch
                      id="booking-fee-enabled"
                      checked={enabled}
                      onCheckedChange={handleEnabledChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="booking-fee-amount">Booking Fee Amount (₹)</Label>
                    <div className="flex items-center">
                      <Input
                        id="booking-fee-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        min="0"
                        step="1"
                        disabled={!enabled}
                        className="max-w-[180px]"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The amount to charge as a booking fee (in Indian Rupees).
                    </p>
                  </div>

                  {!enabled && (
                    <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Booking Fee Disabled</AlertTitle>
                      <AlertDescription>
                        Booking fee is currently disabled. Customers will not be charged a booking fee for ride bookings.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center">
                {hasUnsavedChanges && (
                  <span className="text-sm text-amber-500 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <Button 
                onClick={handleSave} 
                disabled={!hasUnsavedChanges || updateBookingFeeMutation.isPending}
              >
                {updateBookingFeeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Password Change Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your admin account password for security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password (min 6 characters)"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <Alert className="bg-red-50 text-red-800 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    Passwords do not match.
                  </AlertDescription>
                </Alert>
              )}

              {newPassword && newPassword.length < 6 && (
                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    Password must be at least 6 characters long.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handlePasswordChange}
                disabled={
                  !currentPassword || 
                  !newPassword || 
                  !confirmPassword || 
                  newPassword !== confirmPassword ||
                  newPassword.length < 6 ||
                  changePasswordMutation.isPending
                }
                className="w-full"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Google Tag Manager Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Tag Manager
              </CardTitle>
              <CardDescription>
                Configure Google Tag Manager for analytics and tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingGTM ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading GTM settings...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="gtm-enabled">Enable Google Tag Manager</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, GTM scripts will be loaded on all pages.
                      </p>
                    </div>
                    <Switch
                      id="gtm-enabled"
                      checked={gtmEnabled}
                      onCheckedChange={handleGTMEnabledChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="gtm-container-id">GTM Container ID</Label>
                    <Input
                      id="gtm-container-id"
                      type="text"
                      value={gtmContainerId}
                      onChange={(e) => handleGTMContainerIdChange(e.target.value)}
                      placeholder="GTM-XXXXXXX"
                      disabled={!gtmEnabled}
                      className="max-w-[300px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Google Tag Manager Container ID (e.g., GTM-XXXXXXX).
                    </p>
                  </div>

                  {!gtmEnabled && (
                    <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>GTM Disabled</AlertTitle>
                      <AlertDescription>
                        Google Tag Manager is currently disabled. No tracking scripts will be loaded.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center">
                {hasUnsavedGTMChanges && (
                  <span className="text-sm text-amber-500 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <Button 
                onClick={handleGTMSave} 
                disabled={!hasUnsavedGTMChanges || updateGTMMutation.isPending}
              >
                {updateGTMMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* WhatsApp Widget Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Chat Widget
              </CardTitle>
              <CardDescription>
                Configure WhatsApp chat widget for customer support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingWhatsApp ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading WhatsApp settings...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="whatsapp-enabled">Enable WhatsApp Widget</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, a floating WhatsApp chat button will appear on the website.
                      </p>
                    </div>
                    <Switch
                      id="whatsapp-enabled"
                      checked={whatsappEnabled}
                      onCheckedChange={handleWhatsAppEnabledChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="whatsapp-phone">WhatsApp Phone Number</Label>
                    <Input
                      id="whatsapp-phone"
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) => handleWhatsAppPhoneChange(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      disabled={!whatsappEnabled}
                      className="max-w-[300px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      WhatsApp number with country code (e.g., +91XXXXXXXXXX).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="whatsapp-message">Default Message</Label>
                    <Textarea
                      id="whatsapp-message"
                      value={whatsappMessage}
                      onChange={(e) => handleWhatsAppMessageChange(e.target.value)}
                      placeholder="Hi! How can we help you?"
                      disabled={!whatsappEnabled}
                      className="max-w-[400px]"
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      Pre-filled message when users click the WhatsApp widget.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="whatsapp-position">Widget Position</Label>
                    <Select
                      value={whatsappPosition}
                      onValueChange={handleWhatsAppPositionChange}
                      disabled={!whatsappEnabled}
                    >
                      <SelectTrigger className="max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Position of the floating WhatsApp widget on the page.
                    </p>
                  </div>

                  {!whatsappEnabled && (
                    <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>WhatsApp Widget Disabled</AlertTitle>
                      <AlertDescription>
                        WhatsApp widget is currently disabled. Customers will not see the chat button.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center">
                {hasUnsavedWhatsAppChanges && (
                  <span className="text-sm text-amber-500 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <Button 
                onClick={handleWhatsAppSave} 
                disabled={!hasUnsavedWhatsAppChanges || updateWhatsAppMutation.isPending}
              >
                {updateWhatsAppMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}