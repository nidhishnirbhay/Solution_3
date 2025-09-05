import { useState, useEffect } from "react";
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
import { MapPin, Calendar, Phone, Car } from "lucide-react";
import { gtmEvent } from "@/components/integrations/gtm";

const searchSchema = z.object({
  pickupLocation: z.string().min(1, { message: "Pickup location is required" }),
  destinationLocation: z.string().min(1, { message: "Destination location is required" }),
  pickupDate: z.string().min(1, { message: "Pickup date is required" }),
  mobileNumber: z.string()
    .min(10, { message: "Mobile number must be 10 digits" })
    .max(10, { message: "Mobile number must be 10 digits" })
    .regex(/^\d{10}$/, { message: "Mobile number must contain only digits" }),
  rideType: z.enum(["Round Trip", "1 Way Ride", "Sharing Ride"], { message: "Please select a ride type" }),
});

type SearchFormValues = z.infer<typeof searchSchema>;

export function Hero() {



  type UTMParams = {
    utm_id: string;
    utm_source: string;
    utm_term: string;
    utm_content: string;
    utm_campaign: string;
    utm_medium: string;
    gclid?: string;   // ✅ optional
    fbclid?: string;  // ✅ optional
  };


    const [utmParams, setUtmParams] = useState<UTMParams>({
      utm_id: "",
      utm_source: "",
      utm_term: "",
      utm_content: "",
      utm_campaign: "",
      utm_medium: "",
      gclid: "",   // ✅ optional
      fbclid: ""  // ✅ optional
    });

    useEffect(() => {
      const params = new URLSearchParams(window.location.search);

      // ✅ Create a strongly-typed object, not Record<string, string>
      const updatedParams: UTMParams = {
        utm_id: params.get("utm_id") || localStorage.getItem("utm_id") || "",
        utm_source: params.get("utm_source") || localStorage.getItem("utm_source") || "",
        utm_term: params.get("utm_term") || localStorage.getItem("utm_term") || "",
        utm_content: params.get("utm_content") || localStorage.getItem("utm_content") || "",
        utm_campaign: params.get("utm_campaign") || localStorage.getItem("utm_campaign") || "",
        utm_medium: params.get("utm_medium") || localStorage.getItem("utm_medium") || "",
          gclid: params.get("gclid") || localStorage.getItem("gclid") || "",
          fbclid: params.get("fbclid") || localStorage.getItem("fbclid") || "",
      };

      // ✅ Save in localStorage for persistence
      Object.entries(updatedParams).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });

      setUtmParams(updatedParams);
    }, []);

  
  const [, navigate] = useLocation();
  const [isSearching, setIsSearching] = useState(false);
  
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      pickupLocation: "",
      destinationLocation: "",
      pickupDate: new Date().toISOString().split("T")[0],
      mobileNumber: "",
      rideType: undefined as any,
    },
  });

  const onSubmit = async (data: SearchFormValues) => {

    
    setIsSearching(true);
    const storedUTM = {
      utm_id: localStorage.getItem("utm_id") || "",
      utm_source: localStorage.getItem("utm_source") || "",
      utm_term: localStorage.getItem("utm_term") || "",
      utm_content: localStorage.getItem("utm_content") || "",
      utm_campaign: localStorage.getItem("utm_campaign") || "",
      utm_medium: localStorage.getItem("utm_medium") || "",
      gclid:localStorage.getItem("gclid") || "",
      fbclid:localStorage.getItem("fbclid") || "",
    };


    // ✅ Push to Google Sheets Webhook
    try {
      await fetch("https://script.google.com/macros/s/AKfycbwrGk_e2LbiWEB-GdSn0VUDlF8ZJX7z0qn5IuPVMEE-z7mIdNTAuSPSdIRTkhh3VYxcsg/exec", {
        method: "POST",
        mode: "no-cors", // 👈 if you don't need to read the response
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          ...storedUTM, // include UTM data if you collected it
        }),
      });
      console.log("Form data sent to Google Sheets");
    } catch (err) {
      console.error("Failed to send data to Google Sheets:", err);
    }
    
    // Track ride search event in GTM
    gtmEvent('ride_search', {
      pickup_location: data.pickupLocation,
      destination_location:data.destinationLocation,
      ride_type: data.rideType,
      pickup_date: data.pickupDate,
      search_source: 'hero_form',
       ...utmParams,
    });

    // Send form data via email notification
    try {
      await fetch('/api/send-ride-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Track successful ride request
      gtmEvent('ride_request_submitted', {
        pickup_location: data.pickupLocation,
        destination_location: data.destinationLocation,
        ride_type: data.rideType,
        request_method: 'email Sent on OyeGaadi'
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      
      // Track failed ride request
      gtmEvent('ride_request_failed', {
        pickup_location: data.pickupLocation,
        destination_location: data.destinationLocation,
        ride_type: data.rideType,
        error: 'email_send_failed'
      });
    }

    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Redirect based on ride type selection
    if (data.rideType === "Round Trip") {
      navigate("/thank-you");
    } else {
      const searchParams = new URLSearchParams({
        pickup: data.pickupLocation,
        destination: data.destinationLocation,
        date: data.pickupDate,
        mobile: data.mobileNumber,
      });
      
      if (data.rideType === "1 Way Ride") {
        navigate(`/one-way-rides?${searchParams.toString()}`);
      } else if (data.rideType === "Sharing Ride") {
        navigate(`/sharing-rides?${searchParams.toString()}`);
      }
    }
    
    setIsSearching(false);
  };

  

  return (
    <section className="relative bg-gradient-to-r from-primary to-blue-500 py-16 md:py-24 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Find rides at affordable prices
          </h1>
          <p className="text-lg mb-8">
            Book full cars or share rides. Verified drivers, safe journeys.
          </p>

          {/* Search Box */}
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 text-gray-800">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* ✅ Hidden UTM Fields */}

                {Object.entries(utmParams).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value as string} />
                ))}
                
                <div className="flex flex-col md:flex-row gap-4">

        
                  <FormField
                    control={form.control}
                    name="pickupLocation"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              placeholder="Pickup Location"
                              className="pl-10 text-black bg-white"
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destinationLocation"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              placeholder="Destination Location"
                              className="pl-10 text-black bg-white"
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
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              type="date"
                              className="pl-10 text-black bg-white"
                              min={new Date().toISOString().split("T")[0]}
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Mobile Number"
                              className="pl-10 text-black bg-white"
                              maxLength={10}
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="rideType"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose your preferred Ride" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Round Trip">Round Trip</SelectItem>
                            <SelectItem value="1 Way Ride">1 Way Ride</SelectItem>
                            <SelectItem value="Sharing Ride">Sharing Ride</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSearching}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 relative"
                >
                  {isSearching ? (
                    <>
                      <Car className="w-5 h-5 mr-2 animate-cab" />
                      Searching for rides...
                    </>
                  ) : (
                    'Search Rides'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
