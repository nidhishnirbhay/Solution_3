import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RideCard } from "@/components/ride/ride-card";
import { RideRequestModal } from "@/components/ride/ride-request-modal";
import { MapPin, Calendar, Search, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import Head from "next/head";


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

export default function OneWayRides() {
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

  // Fetch rides with filters for one-way rides
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
        type: "one-way", // Filter for one-way rides only
      });
      
      const response = await fetch(`/api/rides/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rides');
      }
      return response.json();
    },
    enabled: !!searchParams.pickup && !!searchParams.destination,
  });

  // Filter rides to only show one-way rides
  const oneWayRides = rides.filter(ride => 
    ride.rideType.includes("one-way") && ride.status === "active"
  );

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Head>
          <title>Book One-Way Rides Online | OyeGaadi - Safe & Affordable</title>
          <meta
            name="description"
            content="Book convenient one-way rides online with OyeGaadi. Travel safely, save money, and connect with reliable drivers."
          />
          <meta property="og:title" content="Book One-Way Rides Online | OyeGaadi" />
          <meta
            property="og:description"
            content="Find and book one-way rides online with OyeGaadi. Safe, reliable, and affordable travel options."
          />
        </Head>
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
      <Head>
        <title>Book One-Way Rides Online | OyeGaadi - Safe & Affordable</title>
        <meta
          name="description"
          content="Book convenient one-way rides online with OyeGaadi. Travel safely, save money, and connect with reliable drivers."
        />
        <meta property="og:title" content="Book One-Way Rides Online | OyeGaadi" />
        <meta
          property="og:description"
          content="Find and book one-way rides online with OyeGaadi. Safe, reliable, and affordable travel options."
        />
      </Head>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">One Way Rides</h1>
          
          {/* Search summary */}
          {searchParams.pickup && searchParams.destination && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-800">
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
                <p className="text-sm text-blue-600 mt-2">
                  Contact: {searchParams.mobile}
                </p>
              )}
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
        {!isLoading && oneWayRides.length > 0 && (
          <div className="space-y-4">
            {oneWayRides.map((ride) => (
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
        {!isLoading && oneWayRides.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No one-way rides found 
            </h3>
            <p className="text-gray-500 mb-6">
              {searchParams.pickup && searchParams.destination 
                ? `No rides available from ${searchParams.pickup} to ${searchParams.destination} on the selected date.`
                : "Try searching with different locations and dates to find available rides."
              }
              <p className="text-gray-500 mb-6">
                We will contact you soon with available options.
              </p>
            </p>
            
            {/* Ride request option */}
            {user && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div className="text-left">
                    <h4 className="font-medium text-yellow-800 mb-1">
                      Can't find what you're looking for?
                    </h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Request a ride and we'll help connect you with drivers.
                    </p>
                    <button
                      onClick={() => setIsRideRequestModalOpen(true)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-yellow-700"
                    >
                      Request a Ride
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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