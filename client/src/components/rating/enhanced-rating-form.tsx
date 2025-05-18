import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
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
import { useAuth } from "@/contexts/auth-context";
import { InteractiveRating } from "./interactive-rating";

const ratingSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  review: z.string().max(150, "Review must be 150 characters or less").optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

interface EnhancedRatingFormProps {
  bookingId: number;
  toUserId: number;
  userName: string;
  userType: "driver" | "customer";
  onSuccess?: () => void;
}

export function EnhancedRatingForm({
  bookingId,
  toUserId,
  userName,
  userType,
  onSuccess
}: EnhancedRatingFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: 0,
      review: "",
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async (data: RatingFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to submit a rating");
      }
      
      const payload = {
        ...data,
        bookingId,
        toUserId,
        fromUserId: user.id,
      };
      const res = await apiRequest("POST", "/api/ratings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/bookings/my-bookings", "/api/bookings/ride-bookings"] 
      });
      
      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your rating",
        variant: "destructive",
      });
    },
  });

  const handleRatingChange = (value: number) => {
    form.setValue("rating", value);
  };

  const moveToNextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const moveToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = (data: RatingFormValues) => {
    ratingMutation.mutate(data);
  };

  const getRatingMessage = (rating: number) => {
    if (rating === 5) return `Excellent! Glad you had a great experience with ${userName}!`;
    if (rating === 4) return `Very good! ${userName} provided a quality service.`;
    if (rating === 3) return `Good. How could ${userName} improve?`;
    if (rating <= 2) return `We're sorry to hear that. What went wrong with ${userName}?`;
    return "";
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="mb-4 rounded-full bg-green-100 p-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8 text-green-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-green-800">Thank you for your feedback!</h3>
              <p className="mt-2 text-sm text-gray-600">
                Your rating helps improve the community for everyone.
              </p>
            </motion.div>
          ) : currentStep === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">
                  How was your experience with {userName}?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {userType === "driver" ? "Rate this customer's behavior" : "Rate this driver's service"}
                </p>
              </div>
              
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <InteractiveRating
                        rating={field.value}
                        onChange={handleRatingChange}
                        size="lg"
                        showLabels={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end mt-6">
                <Button
                  type="button"
                  onClick={moveToNextStep}
                  disabled={form.getValues("rating") === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">
                  {getRatingMessage(form.getValues("rating"))}
                </h3>
                <div className="flex justify-center mt-2 mb-4">
                  <InteractiveRating
                    rating={form.getValues("rating")}
                    onChange={() => {}}
                    readOnly={true}
                    size="md"
                    showLabels={false}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="review"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Leave a comment (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Share your experience..."
                        className="resize-none min-h-[120px]"
                        maxLength={150}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("review");
                        }}
                      />
                    </FormControl>
                    <div className="flex justify-between mt-1">
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/150
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={moveToPreviousStep}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={ratingMutation.isPending}
                >
                  {ratingMutation.isPending ? "Submitting..." : "Submit Rating"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Form>
  );
}