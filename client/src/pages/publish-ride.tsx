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
import { useAuth } from "@/contexts/auth-context";

const publishRideSchema = z.object({
  fromLocation: z.string().min(1, { message: "From location is required" }),
  toLocation: z.string().min(1, { message: "To location is required" }),
  departureDate: z.string().min(1, { message: "Departure date is required" }),
  departureTime: z.string().min(1, { message: "Departure time is required" }),
  estimatedArrivalDate: z.string().optional(),
  estimatedArrivalTime: z.string().optional(),
  rideType: z.enum(["one-way", "sharing"]),
  price: z.string().min(1, { message: "Price is required" }).transform(Number),
  totalSeats: z.string().min(1, { message: "Total seats is required" }).transform(Number),
  availableSeats: z.string().min(1, { message: "Available seats is required" }).transform(Number),
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
      rideType: "one-way",
      price: 0,
      totalSeats: 4,
      availableSeats: 4,
      vehicleType: "",
      vehicleNumber: "",
      description: "",
    },
  });

  const publishRideMutation = useMutation({
    mutationFn: async (data: Omit<PublishRideFormValues, "departureTime" | "estimatedArrivalTime">) => {
      const res = await apiRequest("POST", "/api/rides", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/my-rides"] });
      toast({
        title: "Ride published",
        description: "Your ride has been published successfully",
      });
      navigate("/my-bookings");
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

    // Convert form data to the format expected by the API
    const rideData = {
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      departureDate: combineDepartureDateTime,
      estimatedArrivalDate: estimatedArrivalDateTime,
      rideType: data.rideType,
      price: data.price,
      totalSeats: data.totalSeats,
      availableSeats: data.availableSeats,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
      description: data.description,
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
                        <FormField
                          control={form.control}
                          name="rideType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ride Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select ride type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="one-way">One-Way Full Booking</SelectItem>
                                  <SelectItem value="sharing">Sharing / Pooling</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {field.value === "one-way" 
                                  ? "Customers book the entire vehicle" 
                                  : "Customers can book individual seats"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (₹)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  placeholder={form.watch("rideType") === "one-way" 
                                    ? "Total ride price" 
                                    : "Price per seat"}
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                {form.watch("rideType") === "one-way" 
                                  ? "Total price for the ride" 
                                  : "Price per seat"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="totalSeats"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Seats</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" max="50" {...field} />
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
                                  {...field} 
                                />
                              </FormControl>
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
