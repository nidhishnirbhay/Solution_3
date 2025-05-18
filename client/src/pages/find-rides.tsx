import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RideCard } from "@/components/ride/ride-card";
// Using our local RideProps interface instead of importing
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Calendar, Search, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const searchSchema = z.object({
  from: z.string().min(1, { message: "From location is required" }),
  to: z.string().min(1, { message: "To location is required" }),
  date: z.string().min(1, { message: "Date is required" }),
  type: z.string().default("all"),
});

type SearchFormValues = z.infer<typeof searchSchema>;



export default function FindRides() {
  const search = useSearch();
  const [submittedValues, setSubmittedValues] = useState<SearchFormValues | null>(null);
  
  // Parse search string manually
  const parseSearchParams = () => {
    const params = new URLSearchParams(search ? `?${search}` : "");
    return {
      from: params.get("from") || "",
      to: params.get("to") || "",
      date: params.get("date") || new Date().toISOString().split("T")[0],
      type: params.get("type") || "all",
    };
  };

  // Set up form with URL params
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: parseSearchParams(),
  });

  // When component mounts, if we have search params, trigger the search
  useEffect(() => {
    const params = parseSearchParams();
    if (params.from && params.to) {
      setSubmittedValues(params);
    }
  }, [search]);

  // The search query
  const { data: rides, isLoading, isError } = useQuery({
    queryKey: [
      "/api/rides/search",
      submittedValues ? {
        from: submittedValues.from,
        to: submittedValues.to,
        date: submittedValues.date,
        type: submittedValues.type,
      } : null,
    ],
    queryFn: ({ queryKey }) => {
      // If no search params, don't fetch
      if (!submittedValues) return null;
      
      const [_, params] = queryKey;
      const searchParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value) searchParams.append(key, value as string);
        });
      }
      
      return fetch(`/api/rides/search?${searchParams.toString()}`, {
        credentials: "include",
      }).then(async res => {
        if (!res.ok) {
          // Try to get detailed error message from response
          try {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to fetch rides");
          } catch (parseError) {
            // If we can't parse the error JSON, use generic message with status
            throw new Error(`Search failed with status ${res.status}`);
          }
        }
        return res.json();
      }).catch(error => {
        console.error("Ride search error:", error);
        throw error; // Re-throw to be handled by React Query's error state
      });
    },
    enabled: !!submittedValues,
  });

  const onSubmit = (data: SearchFormValues) => {
    setSubmittedValues(data);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="bg-gradient-to-r from-primary to-blue-500 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Find Your Ride
            </h1>
            
            <div className="bg-white rounded-lg shadow-md p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From</FormLabel>
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
                      name="to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>When</FormLabel>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                            <FormControl>
                              <Input
                                type="date"
                                className="pl-10"
                                {...field}
                                min={new Date().toISOString().split("T")[0]}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ride Type</FormLabel>
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

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      <Search className="h-4 w-4 mr-2" />
                      Search Rides
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Search results */}
          {!submittedValues && (
            <div className="max-w-3xl mx-auto text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Find your perfect ride</h2>
              <p className="text-muted-foreground">
                Enter your departure and destination cities to find available rides.
              </p>
            </div>
          )}
          
          {isLoading && (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-4">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isError && (
            <Alert variant="destructive" className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>
                {rides instanceof Error ? rides.message : "Failed to fetch rides. Please try again later or adjust your search parameters."}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && submittedValues && rides && (
            <>
              <h2 className="text-xl font-semibold mb-6">
                {rides.length} {rides.length === 1 ? "ride" : "rides"} found
                {submittedValues.from && submittedValues.to && (
                  <span className="font-normal text-muted-foreground ml-2">
                    from {submittedValues.from} to {submittedValues.to}
                  </span>
                )}
              </h2>

              {rides.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">No rides found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try different locations or dates to find available rides.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {rides.map((ride) => (
                    <RideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
