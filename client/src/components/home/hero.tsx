import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FormField, 
  FormItem, 
  FormLabel,
  FormControl,
  Form
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Calendar } from "lucide-react";

const searchSchema = z.object({
  fromLocation: z.string().min(1, { message: "From location is required" }),
  toLocation: z.string().min(1, { message: "To location is required" }),
  travelDate: z.string().min(1, { message: "Travel date is required" }),
  rideType: z.string().default("all"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

export function Hero() {
  const [, navigate] = useLocation();
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      fromLocation: "",
      toLocation: "",
      travelDate: new Date().toISOString().split("T")[0],
      rideType: "all",
    },
  });

  const onSubmit = (data: SearchFormValues) => {
    const searchParams = new URLSearchParams({
      from: data.fromLocation,
      to: data.toLocation,
      date: data.travelDate,
      type: data.rideType,
    });
    
    navigate(`/find-rides?${searchParams.toString()}`);
  };

  return (
    <section className="relative bg-gradient-to-r from-primary to-blue-500 py-16 md:py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            One-way rides at affordable prices
          </h1>
          <p className="text-lg mb-8">
            Book full cars or share rides. Verified drivers, safe journeys.
          </p>

          {/* Search Box */}
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 text-gray-800">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="fromLocation"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-neutral-700">From</FormLabel>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              placeholder="Departure city"
                              className="pl-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toLocation"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-neutral-700">To</FormLabel>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              placeholder="Destination city"
                              className="pl-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="travelDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-neutral-700">When</FormLabel>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              type="date"
                              className="pl-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rideType"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-neutral-700">Ride Type</FormLabel>
                        <Select defaultValue={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All Ride Types" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Ride Types</SelectItem>
                            <SelectItem value="one-way">One-Way Full Booking</SelectItem>
                            <SelectItem value="sharing">Sharing / Pooling</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                >
                  Search Rides
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
