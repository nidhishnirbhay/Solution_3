import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  MapPin, 
  Calendar, 
  Car, 
  Users, 
  Search, 
  Filter, 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  AlertCircle,
  CheckCircle,
  User,
  RefreshCw,
} from "lucide-react";

export default function AdminRides() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch rides data with auto-refresh
  const { data: rides, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/rides"],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // Get appropriate badge color for ride status
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "active") return "bg-green-100 text-green-800";
    if (statusLower === "completed") return "bg-blue-100 text-blue-800";
    if (statusLower === "cancelled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Filter rides based on search query and active tab
  const filteredRides = rides
    ? rides.filter((ride: any) => {
        // Search filter - search in from/to locations and vehicle number
        const matchesSearch =
          searchQuery === "" ||
          ride.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.toLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ride.driver?.fullName && ride.driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

        // Tab filter
        if (activeTab === "all") return matchesSearch;
        if (activeTab === "active") return matchesSearch && ride.status.toLowerCase() === "active";
        if (activeTab === "completed") return matchesSearch && ride.status.toLowerCase() === "completed";
        if (activeTab === "cancelled") return matchesSearch && ride.status.toLowerCase() === "cancelled";
        
        return matchesSearch;
      })
    : [];

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="Ride Management">
        {/* Search and filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rides..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("all")}>
                  All Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("active")}>
                  Active Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("completed")}>
                  Completed Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("cancelled")}>
                  Cancelled Rides
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Rides</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Rides listing */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "all" 
                ? "All Rides" 
                : activeTab === "active" 
                  ? "Active Rides" 
                  : activeTab === "completed" 
                    ? "Completed Rides" 
                    : "Cancelled Rides"}
              {filteredRides.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredRides.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              // Loading state
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredRides.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Car className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium">No rides found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery 
                    ? "Try adjusting your search to find what you're looking for." 
                    : "There are no rides matching the selected filter."}
                </p>
              </div>
            ) : (
              // Data table
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>From → To</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRides.map((ride: any) => (
                      <TableRow key={ride.id}>
                        <TableCell className="font-medium">#{ride.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{ride.fromLocation}</span>
                            <span className="text-xs text-muted-foreground">to</span>
                            <span className="font-semibold">{ride.toLocation}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>{ride.driver?.fullName || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(ride.departureDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{ride.vehicleType}</span>
                            <span className="text-xs text-muted-foreground">{ride.vehicleNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusBadge(ride.status)}
                            variant="outline"
                          >
                            {ride.status}
                          </Badge>
                          {ride.status.toLowerCase() === "cancelled" && ride.cancellationReason && (
                            <span 
                              className="block text-xs text-red-500 mt-1 cursor-help" 
                              title={ride.cancellationReason}
                            >
                              View reason
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">₹{ride.price}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRide(ride);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ride detail dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ride Details</DialogTitle>
              <DialogDescription>
                Comprehensive details about the selected ride
              </DialogDescription>
            </DialogHeader>

            {selectedRide && (
              <div className="space-y-6">
                {/* Status and basic info */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <Badge 
                      className={getStatusBadge(selectedRide.status)} 
                      variant="outline"
                    >
                      {selectedRide.status}
                    </Badge>
                    <h3 className="text-xl font-bold mt-2">{selectedRide.fromLocation} to {selectedRide.toLocation}</h3>
                    <p className="text-sm text-muted-foreground">Ride ID: {selectedRide.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">₹{selectedRide.price}</p>
                    <p className="text-sm text-muted-foreground">
                      Posted on {formatDate(selectedRide.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Cancellation reason if applicable */}
                {selectedRide.status.toLowerCase() === "cancelled" && selectedRide.cancellationReason && (
                  <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <h4 className="font-semibold text-red-800">Cancellation Reason</h4>
                    </div>
                    <p className="mt-1 text-red-700">{selectedRide.cancellationReason}</p>
                  </div>
                )}

                {/* Driver details and ride info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Driver info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Driver Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.driver?.fullName || "Unknown"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">KYC Status</dt>
                          <dd className="text-sm">
                            {selectedRide.driver?.isKycVerified ? (
                              <span className="inline-flex items-center text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-red-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Verified
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Vehicle info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Car className="h-4 w-4 mr-2" />
                        Vehicle Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.vehicleType}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.vehicleNumber}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Seating Capacity</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.totalSeats} seats</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Journey details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Journey Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">From</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.fromLocation}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">To</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.toLocation}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Departure Date</dt>
                          <dd className="text-sm text-gray-900">{formatDate(selectedRide.departureDate)}</dd>
                        </div>
                      </dl>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Ride Type</dt>
                          <dd className="text-sm text-gray-900">
                            Full Vehicle Booking
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Total Seats</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.totalSeats}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Available Seats</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.availableSeats}</dd>
                        </div>
                      </dl>
                    </div>
                    {selectedRide.description && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Additional Information</h4>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedRide.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Associated bookings in accordion */}
                {/* This would be implemented with actual booking data */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="bookings">
                    <AccordionTrigger className="text-base font-medium">
                      Associated Bookings
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <p className="text-center text-muted-foreground text-sm">
                        Booking data would be fetched and displayed here
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </RequireAuth>
  );
}