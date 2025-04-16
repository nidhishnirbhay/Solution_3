import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, Calendar, MapPin, User, Users } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
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
  const [seatsToBook, setSeatsToBook] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();

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
                <Badge variant={ride.rideType === "one-way" ? "default" : "secondary"}>
                  {ride.rideType === "one-way" ? "One-Way Full Booking" : "Sharing/Pooling"}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-primary">₹{ride.price}</div>
              <div className="text-sm text-muted-foreground">
                {ride.availableSeats} {ride.availableSeats === 1 ? "seat" : "seats"} available
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
                <AvatarImage src="" alt={driverName} />
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
                  
                  {ride.rideType === "sharing" && (
                    <div className="mb-4">
                      <p className="font-medium mb-2">Number of seats</p>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                          disabled={seatsToBook <= 1}
                        >
                          -
                        </Button>
                        <span className="mx-4 font-medium">{seatsToBook}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSeatsToBook(Math.min(ride.availableSeats, seatsToBook + 1))}
                          disabled={seatsToBook >= ride.availableSeats}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Price per seat</p>
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
                    <span className="text-primary">₹{(ride.price * seatsToBook) + 200}</span>
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
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
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </Card>
  );
}
