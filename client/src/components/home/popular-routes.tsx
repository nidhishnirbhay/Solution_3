import { Link } from "wouter";
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
  const { isLoading } = useQuery({
    queryKey: ['/api/popular-routes'],
    // No queryFn needed as we're using mock data for now
    enabled: false,
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

  return (
    <section className="py-12 bg-neutral-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Popular Routes</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularRoutes.map((route, index) => (
            <Card 
              key={index} 
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{route.from}</div>
                      <div className="text-sm text-neutral-500">to</div>
                      <div className="font-medium">{route.to}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-primary">₹{route.price}</div>
                      <div className="text-sm text-neutral-500">{route.distance}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-sm">
                    <span>{route.rides}+ rides available</span>
                    <Link href={`/find-rides?from=${route.from}&to=${route.to}`}>
                      <a className="text-blue-500 font-medium">View All</a>
                    </Link>
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
