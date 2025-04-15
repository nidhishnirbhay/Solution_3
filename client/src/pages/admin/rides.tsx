import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

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
  CardDescription,
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
  Star, 
  Eye, 
  TrashIcon,
  User
} from "lucide-react";

export default function AdminRides() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { toast } = useToast();

  // Fetch rides data
  const { data: rides, isLoading } = useQuery({
    queryKey: ["/api/admin/rides"],
  });

  // Fetch bookings data for each ride
  const { data: allBookings } = useQuery({
    queryKey: ["/api/admin/bookings"],
  });

  // Delete ride mutation
  const deleteRideMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/rides/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Ride deleted",
        description: "The ride has been deleted successfully",
      });
      setConfirmDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "There was an error deleting the ride",
        variant: "destructive",
      });
    },
  });

  // Filter rides based on search query and active tab
  const filteredRides = rides
    ? rides.filter((ride: any) => {
        // Search filter
        const searchMatch =
          searchQuery === "" ||
          ride.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.toLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());

        // Tab filter
        if (activeTab === "all") return searchMatch;
        if (activeTab === "one-way") return ride.rideType === "one-way" && searchMatch;
        if (activeTab === "sharing") return ride.rideType === "sharing" && searchMatch;
        if (activeTab === "full") return ride.availableSeats === 0 && searchMatch;
        if (activeTab === "available") return ride.availableSeats > 0 && searchMatch;

        return searchMatch;
      })
    : [];

  // Get bookings for a specific ride
  const getRideBookings = (rideId: number) => {
    if (!allBookings) return [];
    return allBookings.filter((booking: any) => booking.rideId === rideId);
  };

  const handleDeleteRide = (ride: any) => {
    setSelectedRide(ride);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRide) {
      deleteRideMutation.mutate(selectedRide.id);
    }
  };

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
                <DropdownMenuItem onClick={() => setActiveTab("one-way")}>
                  One-Way Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("sharing")}>
                  Sharing Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("full")}>
                  Fully Booked
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("available")}>
                  Available Seats
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Rides</TabsTrigger>
            <TabsTrigger value="one-way">One-Way</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
            <TabsTrigger value="full">Fully Booked</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Rides table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Rides {filteredRides?.length > 0 && `(${filteredRides.length})`}
            </CardTitle>
            <CardDescription>
              Manage all rides published on the OyeGaadi platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex justify-between p-4 border rounded-md">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRides?.length === 0 ? (
              <div className="text-center py-10">
                <Car className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No rides found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "No rides match the selected filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRides.map((ride: any) => (
                      <TableRow key={ride.id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3.5 w-3.5 text-primary mr-1" />
                              <span className="font-medium">{ride.fromLocation}</span>
                            </div>
                            <div className="flex items-center text-sm mt-1">
                              <MapPin className="h-3.5 w-3.5 text-primary mr-1" />
                              <span className="font-medium">{ride.toLocation}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>{ride.driver.fullName}</span>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                            <span>{ride.driver.averageRating ? ride.driver.averageRating.toFixed(1) : "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="whitespace-nowrap">
                            {format(new Date(ride.departureDate), "MMM dd, yyyy")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(ride.departureDate), "h:mm a")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ride.rideType === "one-way" ? (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              One-Way
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Sharing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            <span>
                              {ride.availableSeats}/{ride.totalSeats}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-primary">₹{ride.price}</div>
                          <div className="text-xs text-muted-foreground">
                            {ride.rideType === "sharing" ? "per seat" : "full ride"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={() => setSelectedRide(ride)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  <span>View Details</span>
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DropdownMenuItem
                                className="text-red-600"
                                onSelect={() => handleDeleteRide(ride)}
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                <span>Delete Ride</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ride Details Dialog */}
        <Dialog open={!!selectedRide && !confirmDeleteOpen} onOpenChange={(open) => !open && setSelectedRide(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Ride Details</DialogTitle>
              <DialogDescription>
                Detailed information about the selected ride
              </DialogDescription>
            </DialogHeader>
            
            {selectedRide && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Route Information</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">From:</div>
                        <div className="col-span-2 font-medium">{selectedRide.fromLocation}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">To:</div>
                        <div className="col-span-2 font-medium">{selectedRide.toLocation}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Departure:</div>
                        <div className="col-span-2 font-medium">
                          {format(new Date(selectedRide.departureDate), "MMM dd, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      {selectedRide.estimatedArrivalDate && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-sm text-muted-foreground">Est. Arrival:</div>
                          <div className="col-span-2 font-medium">
                            {format(new Date(selectedRide.estimatedArrivalDate), "MMM dd, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Ride Details</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Type:</div>
                        <div className="col-span-2 font-medium">
                          {selectedRide.rideType === "one-way" 
                            ? "One-Way Full Booking" 
                            : "Sharing / Pooling"}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Price:</div>
                        <div className="col-span-2 font-medium">
                          ₹{selectedRide.price} {selectedRide.rideType === "sharing" && "(per seat)"}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Total Seats:</div>
                        <div className="col-span-2 font-medium">{selectedRide.totalSeats}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Available Seats:</div>
                        <div className="col-span-2 font-medium">{selectedRide.availableSeats}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Vehicle:</div>
                        <div className="col-span-2 font-medium">
                          {selectedRide.vehicleType} ({selectedRide.vehicleNumber})
                        </div>
                      </div>
                      {selectedRide.description && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-sm text-muted-foreground">Description:</div>
                          <div className="col-span-2 font-medium">{selectedRide.description}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Driver Information</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Name:</div>
                        <div className="col-span-2 font-medium">{selectedRide.driver.fullName}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">Rating:</div>
                        <div className="col-span-2 font-medium flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                          <span>
                            {selectedRide.driver.averageRating 
                              ? selectedRide.driver.averageRating.toFixed(1) 
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-muted-foreground">KYC Status:</div>
                        <div className="col-span-2 font-medium">
                          {selectedRide.driver.isKycVerified 
                            ? "Verified" 
                            : "Not Verified"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Bookings</h3>
                    <div>
                      {allBookings ? (
                        (() => {
                          const rideBookings = getRideBookings(selectedRide.id);
                          
                          return rideBookings.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                              {rideBookings.map((booking: any) => (
                                <AccordionItem key={booking.id} value={`booking-${booking.id}`}>
                                  <AccordionTrigger className="flex justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">Booking #{booking.id}</span>
                                      <Badge
                                        className={`${
                                          booking.status === "completed"
                                            ? "bg-green-100 text-green-800"
                                            : booking.status === "cancelled"
                                            ? "bg-red-100 text-red-800"
                                            : booking.status === "confirmed"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="px-4 py-2 space-y-2">
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-sm text-muted-foreground">Customer:</div>
                                        <div className="col-span-2">{booking.customer.fullName}</div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-sm text-muted-foreground">Mobile:</div>
                                        <div className="col-span-2">{booking.customer.mobile}</div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-sm text-muted-foreground">Seats:</div>
                                        <div className="col-span-2">{booking.numberOfSeats}</div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-sm text-muted-foreground">Booking Date:</div>
                                        <div className="col-span-2">
                                          {format(new Date(booking.createdAt), "MMM dd, yyyy")}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-sm text-muted-foreground">Amount:</div>
                                        <div className="col-span-2 font-medium">
                                          ₹{(selectedRide.price * booking.numberOfSeats) + booking.bookingFee}
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <div className="text-center py-4 bg-gray-50 rounded-md">
                              <p className="text-muted-foreground">No bookings for this ride yet</p>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex justify-center py-4">
                          <Skeleton className="h-24 w-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedRide(null)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedRide) {
                    handleDeleteRide(selectedRide);
                  }
                }}
              >
                Delete Ride
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Ride</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this ride? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {selectedRide && (
              <div className="py-4">
                <div className="mb-4">
                  <div className="flex items-center text-sm mb-1">
                    <MapPin className="h-4 w-4 text-primary mr-1" />
                    <span className="font-medium">{selectedRide.fromLocation}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 text-primary mr-1" />
                    <span className="font-medium">{selectedRide.toLocation}</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    {format(new Date(selectedRide.departureDate), "MMM dd, yyyy 'at' h:mm a")}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-1" />
                  <span>Driver: {selectedRide.driver.fullName}</span>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteRideMutation.isPending}
              >
                {deleteRideMutation.isPending ? "Deleting..." : "Delete Ride"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </RequireAuth>
  );
}
