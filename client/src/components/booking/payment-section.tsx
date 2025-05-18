import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Booking } from "@shared/schema";

interface PaymentSectionProps {
  booking: Booking;
}

export function PaymentSection({ booking }: PaymentSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  if (!booking.bookingFee || booking.bookingFee === 0) {
    return null;
  }

  const handleMarkAsPaid = async () => {
    try {
      setIsProcessing(true);
      
      const response = await apiRequest("POST", `/api/bookings/${booking.id}/mark-paid`, {});
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/bookings/my-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bookings', booking.id] });
        
        toast({
          title: "Payment Successful",
          description: "Your booking fee has been marked as paid.",
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Booking Fee</CardTitle>
        <CardDescription>
          Payment status for your booking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Amount:</p>
            <p className="text-xl font-semibold">₹{booking.bookingFee}</p>
          </div>
          <Badge variant={booking.isPaid ? "success" : "default"}>
            {booking.isPaid ? "Paid" : "Unpaid"}
          </Badge>
        </div>
      </CardContent>
      {!booking.isPaid && booking.status !== 'cancelled' && (
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Mark as Paid"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will mark your booking fee of ₹{booking.bookingFee} as paid. In a real system, this would redirect to a payment gateway.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMarkAsPaid}>Confirm Payment</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
    </Card>
  );
}