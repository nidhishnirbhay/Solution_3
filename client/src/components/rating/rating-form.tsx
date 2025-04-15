import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(150, "Review must be 150 characters or less").optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

interface RatingFormProps {
  bookingId: number;
  toUserId: number;
  onSuccess?: () => void;
}

export function RatingForm({ bookingId, toUserId, onSuccess }: RatingFormProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const { toast } = useToast();
  
  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: 0,
      review: "",
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async (data: RatingFormValues) => {
      const payload = {
        ...data,
        bookingId,
        toUserId,
      };
      const res = await apiRequest("POST", "/api/ratings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/bookings/my-bookings", "/api/bookings/ride-bookings"] 
      });
      toast({
        title: "Rating submitted",
        description: "Thank you for sharing your feedback!",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your rating",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RatingFormValues) => {
    ratingMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => field.onChange(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          (hoverRating ? star <= hoverRating : star <= field.value)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="review"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Review (optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Share your experience..."
                  className="resize-none"
                  maxLength={150}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-right text-muted-foreground mt-1">
                {field.value?.length || 0}/150 characters
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={ratingMutation.isPending || form.getValues("rating") === 0}
          >
            {ratingMutation.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
