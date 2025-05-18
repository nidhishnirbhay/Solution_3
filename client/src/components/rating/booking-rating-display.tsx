import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Rating {
  id: number;
  fromUserId: number;
  toUserId: number;
  bookingId: number;
  rating: number;
  review?: string;
  createdAt: string;
  fromUser?: {
    id: number;
    fullName: string;
    role: string;
  };
}

export function BookingRatingDisplay({ bookingId }: { bookingId: number }) {
  // Fetch ratings specifically for this booking
  const { data: ratings, isLoading } = useQuery<Rating[]>({
    queryKey: [`/api/ratings/booking/${bookingId}`],
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const ratingsArray = Array.isArray(ratings) ? ratings : [];
  
  if (!ratingsArray.length) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No ratings yet for this booking
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {ratingsArray.map((rating: Rating) => (
          <Card key={rating.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {rating.fromUser?.fullName || "User"}
                  </div>
                  <div className="flex text-yellow-400 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= rating.rating ? "fill-yellow-400" : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {rating.fromUser?.role === "driver" ? "Driver" : "Customer"}
                </Badge>
              </div>
              {rating.review && (
                <p className="text-sm text-muted-foreground mt-2">
                  "{rating.review}"
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {new Date(rating.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}