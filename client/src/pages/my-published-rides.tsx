import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Info, PlusCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function MyPublishedRides() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const queryClient = useQueryClient();

  // Fetch published rides
  const { data: rides, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/rides/my-rides", refreshFlag],
    enabled: !!user && user.role === "driver",
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Handle force refresh functionality
  const handleForceRefresh = useCallback(async () => {
    console.log("🔄 Force refreshing rides data...");
    setRefreshing(true);
    
    try {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/rides/my-rides"] });
      await refetch();
      
      // Update refresh flag to trigger re-render
      setRefreshFlag(prev => prev + 1);
      
      toast({
        title: "Data refreshed",
        description: "Your ride data has been updated from the server",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refetch, queryClient, toast]);
  
  // Automatic refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refreshing rides data...");
      refetch();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [refetch]);

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
    const formattedCurrentTime = new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    }).format(now);
    
    return rides.reduce<{ active: RideProps[], completed: RideProps[] }>(
      (acc, ride) => {
        const rideDate = new Date(ride.departureDate);
        const formattedRideDate = new Intl.DateTimeFormat('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false
        }).format(rideDate);
        
        // Debug log
        console.log("Processing ride:", ride.id, ride.fromLocation, "to", ride.toLocation, "status:", ride.status);
        
        // Check if the database status matches what's displayed
        const isPastRide = rideDate < now;
        
        // Handle cancelled rides - don't display them
        if (ride.status === "cancelled") {
          return acc;
        }
        
        // Add ride to appropriate list based on its status from the database
        if (ride.status === "completed") {
          console.log("Ride is completed, adding to completed list:", ride.id);
          acc.completed.push(ride);
        } else {
          console.log("Ride is active, adding to active list:", ride.id);
          acc.active.push(ride);
        }
        
        // Additional debug info
        console.log(`Ride ${ride.id} (${ride.fromLocation} to ${ride.toLocation}):`, {
          status: ride.status,
          departureDate: formattedRideDate,
          isPastRide: isPastRide,
          currentTime: formattedCurrentTime
        });
        
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
            {/* Action buttons */}
            <div className="flex justify-between items-center mb-6">
              <Button 
                variant="outline" 
                onClick={handleForceRefresh} 
                disabled={refreshing || isLoading}
                className="border-blue-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
              
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