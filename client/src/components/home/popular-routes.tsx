import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Popular routes data
const popularRoutes = [
  {
    from: "Delhi",
    to: "Chandigarh",
    price: 1200,
    distance: "250 km",
    rides: 15
  },
  {
    from: "Mumbai",
    to: "Pune",
    price: 800,
    distance: "150 km",
    rides: 20
  },
  {
    from: "Bangalore",
    to: "Mysore",
    price: 950,
    distance: "145 km",
    rides: 12
  },
  {
    from: "Jaipur",
    to: "Delhi",
    price: 1100,
    distance: "280 km",
    rides: 10
  },
  {
    from: "Chennai",
    to: "Pondicherry",
    price: 750,
    distance: "170 km",
    rides: 8
  },
  {
    from: "Ahmedabad",
    to: "Vadodara",
    price: 600,
    distance: "120 km",
    rides: 15
  }
];

export function PopularRoutes() {
  const [_, navigate] = useLocation();
  const { data: popularRides, isLoading, isError } = useQuery({
    queryKey: ['/api/rides/popular'],
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) {
    return (
      <section className="py-12 bg-neutral-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Popular Routes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <Skeleton className="h-6 w-24 mb-1" />
                        <Skeleton className="h-4 w-8 mb-1" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-6 w-16 mb-1" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Safely handle the data with proper type checking
  const rides = Array.isArray(popularRides) && popularRides.length > 0 
    ? popularRides 
    : [];

  return (
    <section className="py-12 bg-neutral-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Latest Published Rides</h2>
        
        {rides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rides.slice(0, 6).map((ride, index) => (
              <Card 
                key={ride.id || index} 
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{ride.fromLocation}</div>
                        <div className="text-sm text-neutral-500">to</div>
                        <div className="font-medium">{ride.toLocation}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-primary">₹{ride.price}</div>
                        <div className="text-sm text-neutral-500">
                          {formatDate(ride.departureDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between text-sm">
                      <span>Full booking ({ride.totalSeats} seats)</span>
                      <span 
                        onClick={() => navigate(`/find-rides?from=${ride.fromLocation}&to=${ride.toLocation}`)}
                        className="text-blue-500 font-medium cursor-pointer"
                      >
                        Book Now
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-3xl font-bold text-gray-300 mb-4">
              <span className="inline-block animate-pulse">🚗</span>
            </div>
            <p className="text-lg font-medium text-gray-500 mb-2">Currently No Active Rides</p>
            <p className="text-sm text-gray-400">Check back later for new ride listings or publish your own ride</p>
          </div>
        )}
      </div>
    </section>
  );
}
