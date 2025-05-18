import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Rating {
  id: number;
  fromUserId: number;
  toUserId: number;
  rating: number;
  review?: string;
  createdAt: string;
  fromUser?: {
    id: number;
    fullName: string;
    role: string;
  };
}

export function RatingDisplay({ userId }: { userId: number }) {
  const { data: ratings, isLoading } = useQuery({
    queryKey: [`/api/ratings/user/${userId}`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No ratings yet
      </div>
    );
  }

  // Calculate average rating
  const averageRating = 
    ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.floor(averageRating)
                    ? "fill-yellow-400"
                    : star === Math.ceil(averageRating) &&
                      averageRating % 1 !== 0
                    ? "fill-yellow-400/50"
                    : ""
                }`}
              />
            ))}
          </div>
          <span className="font-medium">{averageRating.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">
            ({ratings.length} {ratings.length === 1 ? "rating" : "ratings"})
          </span>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="reviews">
          <AccordionTrigger>View all ratings & reviews</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {ratings.map((rating) => (
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}