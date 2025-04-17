import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RequireAuth } from "@/components/layout/require-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RideCard, RideProps } from "@/components/ride/ride-card";
import { Info, PlusCircle } from "lucide-react";
import { format } from "date-fns";

export default function MyPublishedRides() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");

  // Fetch published rides
  const { data: rides, isLoading, isError } = useQuery({
    queryKey: ["/api/rides/my-rides"],
    enabled: !!user && user.role === "driver",
  });

  if (isError) {
    toast({
      title: "Error fetching rides",
      description: "Could not load your published rides. Please try again later.",
      variant: "destructive",
    });
  }

  const getRidesList = () => {
    if (!rides || !Array.isArray(rides)) return { active: [], completed: [] };
    
    const now = new Date();
    
    return rides.reduce<{ active: RideProps[], completed: RideProps[] }>(
      (acc, ride) => {
        console.log("Processing ride:", ride.id, ride.fromLocation, "to", ride.toLocation, "status:", ride.status);
        
        // First check for explicit status flags
        if (ride.status === "completed") {
          // If ride is explicitly marked as completed, always put in completed section
          console.log("Ride is marked completed, adding to completed list");
          acc.completed.push(ride);
        } else if (ride.status === "cancelled") {
          // Cancelled rides don't show in either section
          console.log("Ride is cancelled, not displaying");
        } else {
          // For non-cancelled, non-completed rides:
          const rideDate = new Date(ride.departureDate);
          
          if (rideDate < now) {
            // Past rides that aren't explicitly completed should show in completed section
            // but with a "Mark as Completed" button
            console.log("Ride date is in the past, adding to completed list");
            acc.completed.push(ride);
          } else {
            // Future rides go in active section
            console.log("Ride date is in the future, adding to active list");
            acc.active.push(ride);
          }
        }
        
        return acc;
      },
      { active: [], completed: [] }
    );
  };

  const { active, completed } = getRidesList();

  return (
    <RequireAuth allowedRoles={["driver"]}>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="bg-gradient-to-r from-primary to-blue-500 py-8">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                My Published Rides
              </h1>
              <p className="text-white text-opacity-90">
                View and manage your published rides
              </p>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            {/* Publish new ride button */}
            <div className="flex justify-end mb-6">
              <Link href="/publish-ride">
                <Button className="bg-primary hover:bg-primary/90">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Publish New Ride
                </Button>
              </Link>
            </div>

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
                {rides && Array.isArray(rides) && rides.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h2 className="text-xl font-semibold mb-2">No published rides</h2>
                      <p className="text-muted-foreground mb-6">
                        You haven't published any rides yet.
                      </p>
                      <Link href="/publish-ride">
                        <Button className="bg-primary hover:bg-primary/90">
                          Publish Your First Ride
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                      <TabsTrigger value="active">
                        Active Rides ({active.length})
                      </TabsTrigger>
                      <TabsTrigger value="completed">
                        Completed Rides ({completed.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="active" className="space-y-4">
                      {active.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <h3 className="text-lg font-medium mb-2">No active rides</h3>
                          <p className="text-muted-foreground">
                            You don't have any upcoming or active rides.
                          </p>
                        </div>
                      ) : (
                        active.map((ride: RideProps) => (
                          <RideCard 
                            key={ride.id} 
                            ride={ride} 
                          />
                        ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="completed" className="space-y-4">
                      {completed.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <h3 className="text-lg font-medium mb-2">No completed rides</h3>
                          <p className="text-muted-foreground">
                            Your completed rides will appear here.
                          </p>
                        </div>
                      ) : (
                        completed.map((ride: RideProps) => (
                          <RideCard 
                            key={ride.id} 
                            ride={ride} 
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