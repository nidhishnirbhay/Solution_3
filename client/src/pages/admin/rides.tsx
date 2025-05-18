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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  Filter,
  ChevronDown,
  Eye,
  MapPin,
  Calendar,
  Clock,
  User,
  Car,
  Banknote,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";

export default function AdminRides() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch rides data
  const { data: rides, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/rides"],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Format date and time for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "published") return "bg-blue-100 text-blue-800";
    if (statusLower === "active") return "bg-green-100 text-green-800";
    if (statusLower === "completed") return "bg-purple-100 text-purple-800";
    if (statusLower === "cancelled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Filter rides based on search query and status filter
  const filteredRides = rides
    ? rides.filter((ride: any) => {
        // Search filter
        const matchesSearch =
          searchQuery === "" ||
          ride.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.toLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.driver?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        if (statusFilter === "all") return matchesSearch;
        return matchesSearch && ride.status.toLowerCase() === statusFilter.toLowerCase();
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
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("published")}>
                  Published Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                  Active Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                  Completed Rides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>
                  Cancelled Rides
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Rides</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Rides table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === "all" 
                ? "All Rides" 
                : statusFilter === "published" 
                  ? "Published Rides" 
                  : statusFilter === "active" 
                    ? "Active Rides" 
                    : statusFilter === "completed"
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
                      <TableHead>Route</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vehicle</TableHead>
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
                            <span className="font-medium">{ride.fromLocation}</span>
                            <span className="text-xs text-muted-foreground">to</span>
                            <span className="font-medium">{ride.toLocation}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>{ride.driver?.fullName || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>{formatDate(ride.departureDate)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>{formatTime(ride.departureDate)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusBadge(ride.status)}
                            variant="outline"
                          >
                            {ride.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div>{ride.vehicleType}</div>
                            <div className="font-medium">{ride.vehicleNumber}</div>
                          </div>
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
                Complete information about the ride
              </DialogDescription>
            </DialogHeader>

            {selectedRide && (
              <div className="space-y-6">
                {/* Ride status and ID */}
                <div className="flex justify-between items-start">
                  <div>
                    <Badge 
                      className={getStatusBadge(selectedRide.status)} 
                      variant="outline"
                    >
                      {selectedRide.status}
                    </Badge>
                    <h3 className="text-lg font-bold mt-2">Ride #{selectedRide.id}</h3>
                    <p className="text-sm text-gray-500">
                      Published on {formatDate(selectedRide.createdAt)} at {formatTime(selectedRide.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      ₹{selectedRide.price}
                    </p>
                    <p className="text-sm text-gray-500">
                      Full Vehicle
                    </p>
                  </div>
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
                          <dt className="text-sm font-medium text-gray-500">Departure Time</dt>
                          <dd className="text-sm text-gray-900">{formatTime(selectedRide.departureDate)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Ride Type</dt>
                          <dd className="text-sm text-gray-900">One-Way Full Booking</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Distance</dt>
                          <dd className="text-sm text-gray-900">{selectedRide.distance || "N/A"}</dd>
                        </div>
                      </dl>
                    </div>
                  </CardContent>
                </Card>

                {/* Driver details */}
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
                        <dt className="text-sm font-medium text-gray-500">Contact</dt>
                        <dd className="text-sm text-gray-900">{selectedRide.driver?.mobile || "N/A"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">KYC Status</dt>
                        <dd className="text-sm text-gray-900">
                          {selectedRide.driver?.isKycVerified ? "Verified" : "Not Verified"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Rating</dt>
                        <dd className="text-sm text-gray-900">
                          {selectedRide.driver?.averageRating 
                            ? `${selectedRide.driver.averageRating.toFixed(1)}/5` 
                            : "No ratings yet"}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* Vehicle details */}
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
                        <dt className="text-sm font-medium text-gray-500">Vehicle Number</dt>
                        <dd className="text-sm text-gray-900">{selectedRide.vehicleNumber}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                        <dd className="text-sm text-gray-900">Full Vehicle</dd>
                      </div>
                      {selectedRide.additionalInfo && (
                        <div className="mt-3 pt-3 border-t">
                          <dt className="text-sm font-medium text-blue-600 mb-1">Special Requirements</dt>
                          <dd className="text-sm bg-blue-50 p-2 rounded">{selectedRide.additionalInfo}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Bookings information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Banknote className="h-4 w-4 mr-2" />
                      Booking Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRide.bookings && selectedRide.bookings.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedRide.bookings.map((booking: any) => (
                              <TableRow key={booking.id}>
                                <TableCell>#{booking.id}</TableCell>
                                <TableCell>{booking.customer?.fullName || "Unknown"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {booking.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>₹{booking.bookingFee + selectedRide.price}</TableCell>
                                <TableCell>
                                  {booking.isPaid ? "Paid" : "Pending"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No bookings found for this ride.</p>
                    )}
                  </CardContent>
                </Card>
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