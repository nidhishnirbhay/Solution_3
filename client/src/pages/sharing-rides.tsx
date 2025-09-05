import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RideCard } from "@/components/ride/ride-card";
import { RideRequestModal } from "@/components/ride/ride-request-modal";
import { MapPin, Calendar, Search, Info, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface Ride {
  id: number;
  driverId: number;
  fromLocation: string;
  toLocation: string;
  departureDate: string;
  departureTime: string;
  price: number;
  availableSeats: number;
  vehicleType: string;
  vehicleNumber: string;
  rideType: string[];
  status: string;
  driver?: {
    fullName: string;
    profilePhoto?: string;
    phoneNumber: string;
  };
}

export default function SharingRides() {
  const search = useSearch();
  const [isRideRequestModalOpen, setIsRideRequestModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Parse search parameters
  const parseSearchParams = () => {
    const params = new URLSearchParams(search ? `?${search}` : "");
    return {
      pickup: params.get("pickup") || "",
      destination: params.get("destination") || "",
      date: params.get("date") || "",
      mobile: params.get("mobile") || "",
    };
  };

  const searchParams = parseSearchParams();

  // Fetch rides with filters for sharing rides
  const { 
    data: rides = [] as Ride[], 
    isLoading,
    error 
  } = useQuery<Ride[]>({
    queryKey: ['/api/rides/search', searchParams],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: searchParams.pickup,
        to: searchParams.destination,
        date: searchParams.date,
        type: "sharing", // Filter for sharing rides only
      });
      
      const response = await fetch(`/api/rides/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rides');
      }
      return response.json();
    },
    enabled: !!searchParams.pickup && !!searchParams.destination,
  });

  // Filter rides to only show sharing rides
  const sharingRides = rides.filter(ride => 
    ride.rideType.includes("sharing") && ride.status === "active"
  );

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load rides. Please try again later.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Sharing Rides</h1>
          </div>
          <p className="text-gray-600 mb-6">
            Share your journey and split the cost with other travelers
          </p>
          
          {/* Search summary */}
          {searchParams.pickup && searchParams.destination && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-800">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">
                  {searchParams.pickup} → {searchParams.destination}
                </span>
                {searchParams.date && (
                  <>
                    <Calendar className="h-4 w-4 ml-4" />
                    <span>{searchParams.date}</span>
                  </>
                )}
              </div>
              {searchParams.mobile && (
                <p className="text-sm text-green-600 mt-2">
                  Contact: {searchParams.mobile}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-green-700">
                <Users className="h-4 w-4" />
                <span>Looking for shared rides to split costs</span>
              </div>
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Rides list */}
        {!isLoading && sharingRides.length > 0 && (
          <div className="space-y-4">
            {sharingRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onBookRide={() => {
                  // Handle booking logic
                }}
              />
            ))}
          </div>
        )}

        {/* No rides found */}
        {!isLoading && sharingRides.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No sharing rides found
            </h3>
            <p className="text-gray-500">
              {searchParams.pickup && searchParams.destination 
                ? `No shared rides available from ${searchParams.pickup} to ${searchParams.destination} on the selected date.`
                : "Try searching with different locations and dates to find available shared rides."
              }
            </p>
            <p className="text-gray-500">
              We will contact you soon with available options.
            </p>
            
            {/* Ride request option */}
            {user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="text-left">
                    <h4 className="font-medium text-blue-800 mb-1">
                      Want to share a ride?
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Request a shared ride and connect with other travelers going your way.
                    </p>
                    <button
                      onClick={() => setIsRideRequestModalOpen(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Request a Shared Ride
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Benefits of sharing */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Benefits of Sharing Rides
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Save Money</p>
                <p className="text-gray-600">Split fuel and travel costs with fellow passengers</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Reduce Carbon Footprint</p>
                <p className="text-gray-600">Help the environment by sharing resources</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Meet New People</p>
                <p className="text-gray-600">Connect with like-minded travelers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ride Request Modal */}
        <RideRequestModal
          isOpen={isRideRequestModalOpen}
          onClose={() => setIsRideRequestModalOpen(false)}
          defaultValues={{
            fromLocation: searchParams.pickup,
            toLocation: searchParams.destination,
            date: searchParams.date,
          }}
        />
      </main>
      <Footer />
    </div>
  );
}