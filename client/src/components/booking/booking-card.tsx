import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Star } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RatingForm } from "@/components/rating/rating-form";
import { RatingDisplay } from "@/components/rating/rating-display";
import { BookingRatingDisplay } from "@/components/rating/booking-rating-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface BookingProps {
  id: number;
  customerId: number;
  rideId: number;
  numberOfSeats: number;
  status: string;
  bookingFee: number;
  isPaid: boolean;
  createdAt: string;
  cancellationReason?: string;
  customerHasRated?: boolean;
  driverHasRated?: boolean;
  ride: {
    id: number;
    fromLocation: string;
    toLocation: string;
    departureDate: string;
    price: number;
    rideType: string;
    vehicleType: string;
    vehicleNumber: string;
  };
  driver?: {
    id: number;
    fullName: string;
    averageRating: number;
    mobile?: string;
  };
  customer?: {
    id: number;
    fullName: string;
    averageRating: number;
    mobile?: string;
  };
  viewAs: "customer" | "driver";
}

export function BookingCard({ booking, viewAs }: { booking: BookingProps; viewAs: "customer" | "driver" }) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRatingsDialog, setShowRatingsDialog] = useState(false);
  const { toast } = useToast();

  const formattedDate = format(new Date(booking.ride.departureDate), "MMM dd, yyyy 'at' h:mm a");
  const bookingDate = format(new Date(booking.createdAt), "MMM dd, yyyy");
  
  const person = viewAs === "customer" ? booking.driver : booking.customer;
  const counterpartUserId = person?.id || 0;
  // Here we need to get the user ID based on role - using optional chaining for type safety
  const driverId = booking.driver?.id;
  const currentUserId = viewAs === "customer" ? booking.customerId : driverId || 0;
  
  const [cancellationReason, setCancellationReason] = useState("");
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason?: string }) => {
      console.log(`🔧 Updating booking ${id} status to ${status}${reason ? ' with reason: ' + reason : ''}`);
      const res = await apiRequest("PUT", `/api/bookings/${id}/status`, { status, reason });
      const data = await res.json();
      console.log(`✅ Booking status updated response:`, data);
      return data;
    },
    onSuccess: (data) => {
      // Aggressively invalidate all related queries to ensure real-time updates
      console.log("🔄 Invalidating queries after status update", data);
      
      // Invalidate both customer and driver booking endpoints regardless of viewer
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/ride-bookings"] });
      
      // Also invalidate rides - especially important when confirming or completing
      queryClient.invalidateQueries({ queryKey: ["/api/rides/my-rides"] });
      
      // If confirming a booking, also invalidate search results to reflect updated seat availability
      if (data.status === "confirmed") {
        queryClient.invalidateQueries({ queryKey: ["/api/rides/search"] });
      }
      
      toast({
        title: "Status updated",
        description: "The booking status has been updated successfully",
      });
      
      // Force a second invalidation after a delay to ensure UI is updated
      setTimeout(() => {
        console.log("📌 Performing additional query invalidation for instant refresh");
        queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bookings/ride-bookings"] });
      }, 500);
    },
    onError: (error: any) => {
      console.error("Error updating booking status:", error);
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the booking status",
        variant: "destructive",
      });
    }
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="text-green-500 border-green-500">Confirmed</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-red-500 border-red-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper function to get user initials
  const getInitials = (name: string = "User") => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleStatusUpdate = (status: string) => {
    if (status === "cancelled") {
      setShowCancellationDialog(true);
    } else {
      updateStatusMutation.mutate({ id: booking.id, status });
    }
  };
  
  const handleCancellation = () => {
    updateStatusMutation.mutate({ 
      id: booking.id, 
      status: "cancelled", 
      reason: cancellationReason 
    });
    setShowCancellationDialog(false);
    setCancellationReason("");
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{booking.ride.fromLocation}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{booking.ride.toLocation}</span>
              </div>
            </div>
            <div>
              {getStatusBadge(booking.status)}
            </div>
          </div>
          
          {/* Cancellation Dialog */}
          <Dialog open={showCancellationDialog} onOpenChange={setShowCancellationDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogDescription>
                  Please provide a reason for cancellation
                </DialogDescription>
              </DialogHeader>
              
              <Textarea
                placeholder="Enter reason for cancellation"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="h-24"
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Nevermind</Button>
                </DialogClose>
                <Button 
                  variant="destructive" 
                  onClick={handleCancellation}
                  disabled={!cancellationReason.trim() || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Travel Date</p>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formattedDate}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Booking Date</p>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{bookingDate}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p>{booking.ride.vehicleType} ({booking.ride.vehicleNumber})</p>
            </div>
            <div>
              <p className="text-muted-foreground">Booking Type</p>
              <p>Full Vehicle ({booking.numberOfSeats} seats)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ride Type</p>
              <p>One-Way Full Booking</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Amount</p>
              <p className="font-medium">₹{booking.ride.price + booking.bookingFee}</p>
            </div>
            
            {booking.status === "cancelled" && booking.cancellationReason && (
              <div className="col-span-2 mt-2 p-3 bg-red-50 rounded-md">
                <p className="text-red-800 font-medium mb-1">Cancellation Reason:</p>
                <p className="text-red-700">{booking.cancellationReason}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="" alt={person?.fullName || "User"} />
                <AvatarFallback>{getInitials(person?.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {viewAs === "customer" ? "Driver: " : "Customer: "}
                  {person?.fullName || "User"}
                </div>
                {/* Display contact info based on booking status and role */}
                {/* Case 1: Customer viewing driver contact for confirmed/completed bookings */}
                {viewAs === "customer" && 
                 (booking.status === "confirmed" || booking.status === "completed") && 
                 booking.driver?.mobile && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium">{booking.driver.mobile}</span>
                  </div>
                )}
                
                {/* Case 2: Driver viewing customer contact for confirmed/completed bookings */}
                {viewAs === "driver" && 
                 (booking.status === "confirmed" || booking.status === "completed") && 
                 booking.customer?.mobile && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium">{booking.customer.mobile}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Actions based on booking status and user role */}
              {booking.status === "pending" && (
                <>
                  {viewAs === "driver" && (
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleStatusUpdate("confirmed")}
                      disabled={updateStatusMutation.isPending}
                    >
                      Confirm
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleStatusUpdate("cancelled")}
                    disabled={updateStatusMutation.isPending}
                  >
                    Cancel
                  </Button>
                </>
              )}
              
              {booking.status === "confirmed" && (
                <>
                  {viewAs === "driver" && (
                    <Button 
                      size="sm" 
                      className="bg-blue-500 hover:bg-blue-600"
                      onClick={() => handleStatusUpdate("completed")}
                      disabled={updateStatusMutation.isPending}
                    >
                      Mark Completed
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleStatusUpdate("cancelled")}
                    disabled={updateStatusMutation.isPending}
                  >
                    Cancel
                  </Button>
                </>
              )}
              
              {booking.status === "completed" && !booking.hasRated && (
                <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Rate {viewAs === "customer" ? "Driver" : "Customer"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Rate your {viewAs === "customer" ? "Driver" : "Customer"}
                      </DialogTitle>
                      <DialogDescription>
                        Please share your experience with {person?.fullName}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <RatingForm 
                      bookingId={booking.id}
                      toUserId={person?.id || 0}
                      onSuccess={() => setShowRatingModal(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
              
              {booking.status === "completed" && 
                (viewAs === "customer" ? booking.customerHasRated : booking.driverHasRated) && (
                <Badge variant="outline" className="bg-green-50">
                  Rated
                </Badge>
              )}
              
              {booking.status === "completed" && (
                <Dialog open={showRatingsDialog} onOpenChange={setShowRatingsDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="ml-2">
                      View Ratings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Booking Ratings</DialogTitle>
                      <DialogDescription>
                        Ratings for this specific booking
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Import the BookingRatingDisplay component at the top of the file */}
                    <div className="mt-4">
                      {/* @ts-ignore - will fix type issues later */}
                      <BookingRatingDisplay bookingId={booking.id} />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
