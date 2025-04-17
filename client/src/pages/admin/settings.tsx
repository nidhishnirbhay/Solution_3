import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BookingFeeSettings {
  enabled: boolean;
  amount: number;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API calls
  const { data: bookingFeeSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/admin/settings/booking-fee'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/settings/booking-fee');
      return response as BookingFeeSettings;
    }
  });

  const updateBookingFeeMutation = useMutation({
    mutationFn: async (data: BookingFeeSettings) => {
      const response = await apiRequest('/api/admin/settings/booking-fee', {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response as BookingFeeSettings;
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

  // Form state
  const [enabled, setEnabled] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('200');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Update form state when data is loaded
  useEffect(() => {
    if (bookingFeeSettings) {
      setEnabled(bookingFeeSettings.enabled);
      setAmount(bookingFeeSettings.amount.toString());
      setHasUnsavedChanges(false);
    }
  }, [bookingFeeSettings]);

  // Handle form changes
  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    setHasUnsavedChanges(true);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setHasUnsavedChanges(true);
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
        </div>
      </div>
    </AdminLayout>
  );
}