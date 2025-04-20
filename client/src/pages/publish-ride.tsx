import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addHours } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RequireAuth } from "@/components/layout/require-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";

const publishRideSchema = z.object({
  fromLocation: z.string().min(1, { message: "From location is required" }),
  toLocation: z.string().min(1, { message: "To location is required" }),
  departureDate: z.string().min(1, { message: "Departure date is required" }),
  departureTime: z.string().min(1, { message: "Departure time is required" }),
  estimatedArrivalDate: z.string().optional(),
  estimatedArrivalTime: z.string().optional(),
  rideTypes: z.array(z.enum(["one-way"])).default(["one-way"]),
  oneWayPrice: z.coerce.number()
    .refine(val => val !== undefined && val > 0, { 
      message: "One-way price is required and must be greater than 0" 
    }),
  sharingPrice: z.coerce.number().optional(),
  totalSeats: z.coerce.number().min(1, { message: "Total seats is required" }),
  availableSeats: z.coerce.number().min(1, { message: "Available seats is required" }),
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  vehicleNumber: z.string().min(1, { message: "Vehicle number is required" }),
  description: z.string().optional(),
});

type PublishRideFormValues = z.infer<typeof publishRideSchema>;

export default function PublishRide() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<PublishRideFormValues>({
    resolver: zodResolver(publishRideSchema),
    defaultValues: {
      fromLocation: "",
      toLocation: "",
      departureDate: format(new Date(), "yyyy-MM-dd"),
      departureTime: format(new Date(), "HH:mm"),
      estimatedArrivalDate: format(addHours(new Date(), 3), "yyyy-MM-dd"),
      estimatedArrivalTime: format(addHours(new Date(), 3), "HH:mm"),
      rideTypes: ["one-way"] as ["one-way"],  // Default to one-way ride
      oneWayPrice: 0,
      sharingPrice: 0,
      totalSeats: 4,
      availableSeats: 4,
      vehicleType: "",
      vehicleNumber: "",
      description: "",
    },
  });

  const publishRideMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Publishing ride with data:", data);
        
        // Validate critical fields before sending to server
        if (!data.fromLocation || !data.toLocation) {
          throw new Error("Origin and destination locations are required");
        }
        
        if (!data.departureDate) {
          throw new Error("Departure date and time are required");
        }
        
        if (!data.vehicleType || !data.vehicleNumber) {
          throw new Error("Vehicle information is required");
        }
        
        if (!data.totalSeats || data.totalSeats < 1) {
          throw new Error("Total seats must be at least 1");
        }
        
        const res = await apiRequest("POST", "/api/rides", data);
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to publish ride. Server error.");
        }
        
        return res.json();
      } catch (error) {
        console.error("Failed to publish ride:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to publish ride. Please try again.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/my-rides"] });
      // Also invalidate popular routes on the home page
      queryClient.invalidateQueries({ queryKey: ["/api/rides/popular"] });
      toast({
        title: "Ride published",
        description: "Your ride has been published successfully",
      });
      // Redirect to My Published Rides instead of My Bookings
      navigate("/my-published-rides");
    },
    onError: (error: any) => {
      toast({
        title: "Publication failed",
        description: error.message || "There was an error publishing your ride",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PublishRideFormValues) => {
    // Combine date and time into ISO strings
    const combineDepartureDateTime = new Date(`${data.departureDate}T${data.departureTime}`).toISOString();
    
    let estimatedArrivalDateTime = undefined;
    if (data.estimatedArrivalDate && data.estimatedArrivalTime) {
      estimatedArrivalDateTime = new Date(`${data.estimatedArrivalDate}T${data.estimatedArrivalTime}`).toISOString();
    }

    // Always use one-way price
    const price = data.oneWayPrice;

    // For one-way rides, available seats should always equal total seats
    const availableSeats = data.totalSeats;

    // Creating request payload as plain objects, let server handle conversion
    const rideData = {
      driverId: user?.id,  // Include driver ID from user context
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      // Directly send ISO date strings, server will parse them
      departureDate: combineDepartureDateTime,
      estimatedArrivalDate: estimatedArrivalDateTime || null,
      rideType: ["one-way"],  // Always use one-way ride type
      price: price,
      totalSeats: data.totalSeats,
      availableSeats: availableSeats,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
      description: data.description || "",
    };

    publishRideMutation.mutate(rideData);
  };

  return (
    <RequireAuth allowedRoles={["driver"]} requireKyc>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="bg-gradient-to-r from-primary to-blue-500 py-8">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Publish a New Ride
              </h1>
              <p className="text-white text-opacity-90">
                Fill in the details below to publish your ride.
              </p>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Ride Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Route Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fromLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From</FormLabel>
                              <FormControl>
                                <Input placeholder="Departure city" {...field} />
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
                                <Input placeholder="Destination city" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Departure</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                              control={form.control}
                              name="departureDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="departureTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Estimated Arrival (Optional)</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                              control={form.control}
                              name="estimatedArrivalDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="estimatedArrivalTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Ride Configuration</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FormLabel className="mb-2 block">Ride Type</FormLabel>
                          <div className="space-y-4 mb-2">
                            <FormField
                              control={form.control}
                              name="rideTypes"
                              render={() => (
                                <FormItem className="space-y-3">
                                  <div className="space-y-1">
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox 
                                          checked={true}
                                          disabled={true}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="font-medium">
                                          One-Way Full Booking
                                        </FormLabel>
                                        <FormDescription>
                                          Customers book the entire vehicle
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="space-y-4">
                            {form.watch("rideTypes").includes("one-way") && (
                              <FormField
                                control={form.control}
                                name="oneWayPrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>One-Way Price (₹)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        placeholder="Total ride price"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Total price for the entire vehicle
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
{/* Sharing ride option is disabled */}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="totalSeats"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Seats</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="50"
                                  {...field}
                                  onChange={(e) => {
                                    // Update total seats
                                    field.onChange(e);
                                    
                                    // If ride types includes one-way, available seats should equal total seats
                                    if (form.watch("rideTypes").includes("one-way")) {
                                      const numValue = parseInt(e.target.value, 10);
                                      form.setValue("availableSeats", numValue);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="availableSeats"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available Seats</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max={form.watch("totalSeats")} 
                                  disabled={form.watch("rideTypes").includes("one-way")} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                {form.watch("rideTypes").includes("one-way") 
                                  ? "For one-way rides, all seats are automatically available" 
                                  : "Number of seats available for booking"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Vehicle Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vehicleType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehicle Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Sedan, SUV" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="vehicleNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehicle Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. DL01AB1234" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Information (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Provide additional details about the ride..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Add any extra information passengers should know about your ride.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4 text-sm mb-4">
                      <h4 className="font-medium text-orange-800 mb-2">Important Notice:</h4>
                      <p className="text-orange-700">
                        OyeGaadi does not encourage booking for flights, exams, or urgent time-bound events. 
                        Passengers will receive a disclaimer about potential delays.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/90"
                        disabled={publishRideMutation.isPending}
                      >
                        {publishRideMutation.isPending ? "Publishing..." : "Publish Ride"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
