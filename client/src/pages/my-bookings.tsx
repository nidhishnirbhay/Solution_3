import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RequireAuth } from "@/components/layout/require-auth";
import { BookingCard } from "@/components/booking/booking-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, PlusCircle, AlertCircle } from "lucide-react";

export default function MyBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");

  // Fetch bookings based on user role
  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: [
      user?.role === "customer" 
        ? "/api/bookings/my-bookings" 
        : "/api/bookings/ride-bookings"
    ],
    enabled: !!user
  });

  // Fetch driver rides if user is a driver
  const { data: rides } = useQuery({
    queryKey: ["/api/rides/my-rides"],
    enabled: user?.role === "driver",
  });

  const getBookingsList = () => {
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return { upcoming: [], past: [] };
    }

    const now = new Date();
    
    return bookings.reduce(
      (acc: { upcoming: any[], past: any[] }, booking: any) => {
        // Safety check for booking.ride
        if (!booking || !booking.ride || !booking.ride.departureDate) {
          return acc;
        }
        
        const rideDate = new Date(booking.ride.departureDate);
        
        if (booking.status === "cancelled") {
          acc.past.push(booking);
        } else if (booking.status === "completed") {
          acc.past.push(booking);
        } else if (rideDate < now) {
          acc.past.push(booking);
        } else {
          acc.upcoming.push(booking);
        }
        
        return acc;
      },
      { upcoming: [], past: [] }
    );
  };

  const { upcoming, past } = getBookingsList();

  return (
    <RequireAuth>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="bg-gradient-to-r from-primary to-blue-500 py-8">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {user?.role === "customer" ? "My Bookings" : "My Rides"}
              </h1>
              <p className="text-white text-opacity-90">
                {user?.role === "customer" 
                  ? "View and manage your ride bookings" 
                  : "View and manage bookings for your published rides"}
              </p>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            {/* Driver-specific publish ride button */}
            {user?.role === "driver" && (
              <div className="flex justify-end mb-6">
                <Link href="/publish-ride">
                  <Button className="bg-primary hover:bg-primary/90">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Publish New Ride
                  </Button>
                </Link>
              </div>
            )}
            
            {/* KYC notice for customers */}
            {user?.role === "customer" && !user.isKycVerified && (
              <Alert className="mb-6 border-yellow-500 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">KYC Verification Required</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Complete your KYC verification to continue booking rides.
                  <br />
                  <Link href="/kyc-verification">
                    <Button variant="outline" size="sm" className="mt-2">
                      Complete KYC
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between mb-4">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {!bookings || !Array.isArray(bookings) || bookings.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h2 className="text-xl font-semibold mb-2">No bookings found</h2>
                      <p className="text-muted-foreground mb-6">
                        {user?.role === "customer" 
                          ? "You haven't made any bookings yet." 
                          : "No one has booked your rides yet."}
                      </p>
                      {user?.role === "customer" ? (
                        <Link href="/find-rides">
                          <Button className="bg-primary hover:bg-primary/90">
                            Find Rides
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/publish-ride">
                          <Button className="bg-primary hover:bg-primary/90">
                            Publish a Ride
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                      <TabsTrigger value="upcoming">
                        Upcoming ({upcoming.length})
                      </TabsTrigger>
                      <TabsTrigger value="past">
                        Past ({past.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upcoming" className="space-y-4">
                      {upcoming.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <h3 className="text-lg font-medium mb-2">No upcoming bookings</h3>
                          <p className="text-muted-foreground">
                            {user?.role === "customer" 
                              ? "You don't have any upcoming ride bookings." 
                              : "You don't have any upcoming ride bookings."}
                          </p>
                        </div>
                      ) : (
                        upcoming.map((booking) => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            viewAs={user?.role === "customer" ? "customer" : "driver"}
                          />
                        ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="past" className="space-y-4">
                      {past.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <h3 className="text-lg font-medium mb-2">No past bookings</h3>
                          <p className="text-muted-foreground">
                            Your past bookings will appear here.
                          </p>
                        </div>
                      ) : (
                        past.map((booking) => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            viewAs={user?.role === "customer" ? "customer" : "driver"}
                          />
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
