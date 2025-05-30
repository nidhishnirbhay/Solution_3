import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const rideRequestSchema = z.object({
  fromLocation: z.string().min(1, "From location is required"),
  toLocation: z.string().min(1, "To location is required"),
  preferredDate: z.string().min(1, "Preferred date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, "Date cannot be in the past"),
  preferredTime: z.string().optional(),
  numberOfPassengers: z.number().min(1, "At least 1 passenger required").max(8, "Maximum 8 passengers"),
  maxBudget: z.number().min(0, "Budget must be positive").optional(),
  contactNumber: z.string().min(10, "Valid contact number required"),
  additionalNotes: z.string().optional()
});

type RideRequestForm = z.infer<typeof rideRequestSchema>;

interface RideRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    fromLocation?: string;
    toLocation?: string;
    date?: string;
  };
}

export function RideRequestModal({ isOpen, onClose, initialData }: RideRequestModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<RideRequestForm>({
    resolver: zodResolver(rideRequestSchema),
    defaultValues: {
      fromLocation: initialData?.fromLocation || "",
      toLocation: initialData?.toLocation || "",
      preferredDate: initialData?.date || "",
      preferredTime: "",
      numberOfPassengers: 1,
      maxBudget: undefined,
      contactNumber: "",
      additionalNotes: ""
    }
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: RideRequestForm) => apiRequest('POST', '/api/ride-requests', data),
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your ride request has been submitted successfully. Our admin will contact you soon."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ride-requests/my-requests'] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit ride request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: RideRequestForm) => {
    createRequestMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Ride Request</DialogTitle>
          <DialogDescription>
            Can't find a suitable ride? Submit your request and our admin will help connect you with drivers.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <Input placeholder="Starting location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="toLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input placeholder="Destination" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numberOfPassengers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Passengers</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select passengers" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'passenger' : 'passengers'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maxBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Budget (₹) (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Your budget"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Your mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any specific requirements or preferences..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}