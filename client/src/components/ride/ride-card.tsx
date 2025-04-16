import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Star, Calendar, MapPin, User, Users } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { AuthModal } from "@/components/ui/auth-modal";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export interface RideProps {
  id: number;
  fromLocation: string;
  toLocation: string;
  departureDate: string;
  rideType: string | string[];
  price: number;
  availableSeats: number;
  totalSeats: number;
  vehicleType: string;
  vehicleNumber: string;
  description?: string;
  driver?: {
    id: number;
    fullName: string;
    averageRating: number;
    isKycVerified: boolean;
  };
  driverId?: number; // For when driver object isn't included
}

export function RideCard({ ride }: { ride: RideProps }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  // For full vehicle booking, we use total seats
  const [seatsToBook] = useState(ride.totalSeats);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if the current user has already booked this ride
  const { data: myBookings } = useQuery({
    queryKey: ["/api/bookings/my-bookings"],
    enabled: !!user && user.role === "customer", // Only fetch if user is logged in and is a customer
  });
  
  // Check if this ride is already booked by the current user
  const alreadyBooked = useMemo(() => {
    if (!myBookings || !user || !Array.isArray(myBookings)) return false;
    return myBookings.some((booking: any) => 
      booking.rideId === ride.id && booking.status !== 'cancelled'
    );
  }, [myBookings, ride.id, user]);

  const formattedDate = format(new Date(ride.departureDate), "MMM dd, yyyy 'at' h:mm a");
  
  const bookingMutation = useMutation({
    mutationFn: async (data: { rideId: number; numberOfSeats: number }) => {
      // customerId is added by the server from the session - we don't need to provide it
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-bookings"] });
      toast({
        title: "Booking successful",
        description: "Your ride has been booked successfully!",
      });
    },
    onError: (error: any) => {
      // Check if KYC is required
      if (error.message?.includes("KYC verification required")) {
        toast({
          title: "KYC verification required",
          description: "Please complete your KYC verification before booking more rides.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking failed",
          description: error.message || "There was an error booking your ride",
          variant: "destructive",
        });
      }
    }
  });
  
  const cancelRideMutation = useMutation({
    mutationFn: async (data: { id: number; reason: string }) => {
      console.log("Sending ride cancellation request with data:", {
        id: data.id,
        cancellationReason: data.reason
      });
      const res = await apiRequest("PATCH", `/api/rides/${data.id}/cancel`, { cancellationReason: data.reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/my-rides"] });
      toast({
        title: "Ride cancelled",
        description: "Your ride has been cancelled successfully",
      });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message || "There was an error cancelling your ride",
        variant: "destructive",
      });
    }
  });

  const handleBooking = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (user.role === "driver") {
      toast({
        title: "Cannot book as driver",
        description: "Please use a customer account to book rides",
        variant: "destructive",
      });
      return;
    }
    
    // Prevent booking if the user is the driver of this ride
    if (user.id === ride.driverId) {
      toast({
        title: "Cannot book your own ride",
        description: "You can't book a ride that you published",
        variant: "destructive",
      });
      return;
    }

    bookingMutation.mutate({
      rideId: ride.id,
      numberOfSeats: seatsToBook,
    });
  };

  // Helper function to get user initials
  const getInitials = (name: string | undefined) => {
    if (!name) return "DR";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle cancel ride
  const handleCancelRide = () => {
    cancelRideMutation.mutate({
      id: ride.id,
      reason: cancelReason
    });
  };

  // If the driver info isn't available but we're in the driver's view, use current user
  const isCurrentUserDriver = user?.id === ride.driverId;
  const driverName = ride.driver?.fullName || (isCurrentUserDriver ? user?.fullName : "Driver");

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{ride.fromLocation}</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{ride.toLocation}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex gap-2 mb-2">
                <Badge variant="default">
                  One-Way Full Booking
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-primary">₹{ride.price}</div>
              <div className="text-sm text-muted-foreground">
                Full vehicle booking
              </div>
              <div className="text-sm">
                {ride.vehicleType} ({ride.vehicleNumber})
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="" alt={driverName || ""} />
                <AvatarFallback>{getInitials(driverName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{driverName}</div>
                <div className="flex items-center text-sm">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                  <span>{ride.driver?.averageRating?.toFixed(1) || "4.0"}</span>
                  {ride.driver?.isKycVerified && (
                    <Badge variant="outline" className="ml-2 text-xs">Verified</Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Show different buttons based on user role and if they're the driver */}
            {isCurrentUserDriver ? (
              <Button 
                variant="destructive" 
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel Ride
              </Button>
            ) : alreadyBooked ? (
              <Button variant="outline" disabled className="cursor-not-allowed">
                Already Booked
              </Button>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">Book Now</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Book this ride</DialogTitle>
                    <DialogDescription>
                      Confirm your booking details below
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">From</p>
                        <p className="font-medium">{ride.fromLocation}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">To</p>
                        <p className="font-medium">{ride.toLocation}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium">{formattedDate}</p>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-medium">Driver</p>
                      <div className="flex items-center">
                        <span>{driverName}</span>
                        <div className="flex items-center ml-2">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm ml-1">{ride.driver?.averageRating?.toFixed(1) || "4.0"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between">
                        <p className="font-medium">Booking Type</p>
                        <p className="font-medium">Full Vehicle</p>
                      </div>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Full vehicle booking</p>
                        <p className="font-medium">₹{ride.price}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Booking fee</p>
                        <p className="font-medium">₹200</p>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-3 text-sm mb-4">
                      <p className="font-medium mb-1 text-orange-800">Important:</p>
                      <p className="text-orange-700">
                        OyeGaadi does not encourage booking for flights, exams, or urgent time-bound events as delays may occur due to traffic or other conditions.
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center font-medium text-lg mt-4">
                      <span>Total amount</span>
                      <span className="text-primary">₹{ride.price + 200}</span>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button 
                        className="bg-primary hover:bg-primary/90" 
                        onClick={handleBooking}
                        disabled={bookingMutation.isPending}
                      >
                        {bookingMutation.isPending ? (
                          <>
                            <span className="animate-spin mr-1">⟳</span> Processing...
                          </>
                        ) : (
                          "Confirm Booking"
                        )}
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Modal for driver to cancel a ride */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Ride</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this ride? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">
                  Reason for cancellation
                </label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation"
                  className="w-full"
                />
              </div>
              
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Cancelling rides frequently may affect your driver rating. 
                  Remember that passengers may have made plans based on your scheduled ride.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Ride
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelRide}
              disabled={cancelRideMutation.isPending || !cancelReason.trim()}
            >
              {cancelRideMutation.isPending ? (
                <>
                  <span className="animate-spin mr-1">⟳</span> Processing...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </Card>
  );
}
