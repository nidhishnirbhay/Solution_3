import { useState } from "react";
import { Star, Quote, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InteractiveRating } from "./interactive-rating";

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

export function InteractiveRatingDisplay({ bookingId }: { bookingId: number }) {
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);

  // Fetch ratings specifically for this booking
  const { data: ratings, isLoading } = useQuery<Rating[]>({
    queryKey: [`/api/ratings/booking/${bookingId}`],
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  const ratingsArray = Array.isArray(ratings) ? ratings : [];
  
  if (!ratingsArray.length) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
        <Quote className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">
          No ratings yet for this booking
        </p>
      </div>
    );
  }

  // Calculate average rating
  const averageRating = 
    ratingsArray.reduce((sum, rating) => sum + rating.rating, 0) / ratingsArray.length;

  // Sort ratings so that ratings with reviews appear first
  const sortedRatings = [...ratingsArray].sort((a, b) => {
    if (a.review && !b.review) return -1;
    if (!a.review && b.review) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Summary section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6 bg-muted/30 p-4 rounded-lg"
      >
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">Average Rating</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              from {ratingsArray.length} {ratingsArray.length === 1 ? "rating" : "ratings"}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <InteractiveRating 
            rating={Math.round(averageRating)} 
            onChange={() => {}} 
            readOnly 
            size="sm"
            showLabels={false}
          />
        </div>
      </motion.div>

      {/* Individual ratings */}
      <div className="grid gap-4">
        <AnimatePresence mode="wait">
          {selectedRating ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {selectedRating.fromUser?.fullName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {selectedRating.fromUser?.fullName || "User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(selectedRating.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedRating.fromUser?.role === "driver" ? "Driver" : "Customer"}
                    </Badge>
                  </div>
                  
                  <InteractiveRating 
                    rating={selectedRating.rating} 
                    onChange={() => {}} 
                    readOnly 
                    showLabels
                  />
                  
                  {selectedRating.review ? (
                    <div className="mt-4 bg-muted/30 p-4 rounded-lg">
                      <Quote className="h-4 w-4 mb-2 text-muted-foreground" />
                      <p className="text-sm italic">
                        "{selectedRating.review}"
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 bg-muted/20 p-4 rounded-lg border border-dashed text-center">
                      <p className="text-sm text-muted-foreground">
                        No written review provided
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedRating(null)}
                    >
                      Back to all ratings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              layout
              className="space-y-3"
            >
              {sortedRatings.map((rating: Rating) => (
                <motion.div
                  key={rating.id}
                  whileHover={{ scale: 1.01 }}
                  className="cursor-pointer"
                  onClick={() => setSelectedRating(rating)}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10">
                              {rating.fromUser?.fullName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium truncate">
                            {rating.fromUser?.fullName || "User"}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({rating.fromUser?.role === "driver" ? "Driver" : "Customer"})
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="font-medium mr-1">{rating.rating}</span>
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        </div>
                      </div>
                      
                      {rating.review && (
                        <div className="mt-2 pl-10">
                          <p className="text-sm text-muted-foreground truncate max-w-[230px]">
                            "{rating.review}"
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}