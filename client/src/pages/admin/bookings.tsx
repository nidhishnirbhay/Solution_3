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
  X,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Banknote,
  User,
  Car,
  RotateCw,
  RefreshCw,
} from "lucide-react";

export default function AdminBookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch bookings data
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/bookings"],
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

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "confirmed") return "bg-green-100 text-green-800";
    if (statusLower === "completed") return "bg-blue-100 text-blue-800";
    if (statusLower === "pending") return "bg-yellow-100 text-yellow-800";
    if (statusLower === "cancelled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Filter bookings based on search query and status filter
  const filteredBookings = bookings
    ? bookings.filter((booking: any) => {
        // Search filter
        const matchesSearch =
          searchQuery === "" ||
          booking.ride?.fromLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.ride?.toLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.customer?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.driver?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(booking.id).includes(searchQuery);

        // Status filter
        if (statusFilter === "all") return matchesSearch;
        if (statusFilter === "pending") return matchesSearch && booking.status.toLowerCase() === "pending";
        if (statusFilter === "confirmed") return matchesSearch && booking.status.toLowerCase() === "confirmed";
        if (statusFilter === "completed") return matchesSearch && booking.status.toLowerCase() === "completed";
        if (statusFilter === "cancelled") return matchesSearch && booking.status.toLowerCase() === "cancelled";

        return matchesSearch;
      })
    : [];

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="Booking Management">
        {/* Search and filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
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
                  All Bookings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("confirmed")}>
                  Confirmed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Bookings</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bookings table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === "all" 
                ? "All Bookings" 
                : statusFilter === "pending" 
                  ? "Pending Bookings" 
                  : statusFilter === "confirmed" 
                    ? "Confirmed Bookings" 
                    : statusFilter === "completed"
                      ? "Completed Bookings"
                      : "Cancelled Bookings"}
              {filteredBookings.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredBookings.length})
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
            ) : filteredBookings.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium">No bookings found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery 
                    ? "Try adjusting your search to find what you're looking for." 
                    : "There are no bookings matching the selected filter."}
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
                      <TableHead>Customer</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">#{booking.id}</TableCell>
                        <TableCell>
                          {booking.ride && (
                            <div className="flex flex-col">
                              <span className="font-medium">{booking.ride.fromLocation}</span>
                              <span className="text-xs text-muted-foreground">to</span>
                              <span className="font-medium">{booking.ride.toLocation}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.customer && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{booking.customer.fullName}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.driver && (
                            <div className="flex items-center">
                              <Car className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{booking.driver.fullName}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.ride && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(booking.ride.departureDate)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusBadge(booking.status)}
                            variant="outline"
                          >
                            {booking.status}
                          </Badge>
                          {booking.status.toLowerCase() === "cancelled" && booking.cancellationReason && (
                            <span 
                              className="block text-xs text-red-500 mt-1 cursor-help" 
                              title={booking.cancellationReason}
                            >
                              View reason
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">₹{booking.ride?.price || 0}</span>
                          {booking.status.toLowerCase() === "pending" && (
                            <div className="text-xs text-gray-500">
                              {booking.isPaid ? "Paid" : "Unpaid"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBooking(booking);
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

        {/* Booking detail dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Complete information about the booking
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6">
                {/* Booking status and ID */}
                <div className="flex justify-between items-start">
                  <div>
                    <Badge 
                      className={getStatusBadge(selectedBooking.status)} 
                      variant="outline"
                    >
                      {selectedBooking.status}
                    </Badge>
                    <h3 className="text-lg font-bold mt-2">Booking #{selectedBooking.id}</h3>
                    <p className="text-sm text-gray-500">
                      Created on {formatDate(selectedBooking.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      ₹{selectedBooking.ride?.price || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      Seats: {selectedBooking.numberOfSeats || 'Full Vehicle'}
                    </p>
                  </div>
                </div>

                {/* Cancellation reason if applicable */}
                {selectedBooking.status.toLowerCase() === "cancelled" && selectedBooking.cancellationReason && (
                  <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <h4 className="font-semibold text-red-800">Cancellation Reason</h4>
                    </div>
                    <p className="mt-1 text-red-700">{selectedBooking.cancellationReason}</p>
                  </div>
                )}

                {/* Journey details */}
                {selectedBooking.ride && (
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
                            <dd className="text-sm text-gray-900">{selectedBooking.ride.fromLocation}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">To</dt>
                            <dd className="text-sm text-gray-900">{selectedBooking.ride.toLocation}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Departure Date</dt>
                            <dd className="text-sm text-gray-900">{formatDate(selectedBooking.ride.departureDate)}</dd>
                          </div>
                        </dl>
                        <dl className="space-y-2">
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
                            <dd className="text-sm text-gray-900">{selectedBooking.ride.vehicleType}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Vehicle Number</dt>
                            <dd className="text-sm text-gray-900">{selectedBooking.ride.vehicleNumber}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Ride Type</dt>
                            <dd className="text-sm text-gray-900">Full Vehicle Booking</dd>
                          </div>
                        </dl>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Customer and driver details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{selectedBooking.customer?.fullName || "Unknown"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Contact</dt>
                          <dd className="text-sm text-gray-900">{selectedBooking.customer?.mobile || "N/A"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">KYC Status</dt>
                          <dd className="text-sm">
                            {selectedBooking.customer?.isKycVerified ? (
                              <span className="inline-flex items-center text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-red-600">
                                <X className="h-3 w-3 mr-1" />
                                Not Verified
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Driver info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Car className="h-4 w-4 mr-2" />
                        Driver Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{selectedBooking.driver?.fullName || "Unknown"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Contact</dt>
                          <dd className="text-sm text-gray-900">{selectedBooking.driver?.mobile || "N/A"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Rating</dt>
                          <dd className="text-sm text-gray-900">
                            {selectedBooking.driver?.averageRating 
                              ? `${selectedBooking.driver.averageRating.toFixed(1)}/5` 
                              : "No ratings yet"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Banknote className="h-4 w-4 mr-2" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Booking Fee</dt>
                        <dd className="text-sm text-gray-900">₹{selectedBooking.bookingFee || 0}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Ride Fare</dt>
                        <dd className="text-sm text-gray-900">₹{selectedBooking.ride?.price || 0}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                        <dd className="text-sm font-bold text-gray-900">
                          ₹{(selectedBooking.bookingFee || 0) + (selectedBooking.ride?.price || 0)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                        <dd className="text-sm">
                          {selectedBooking.isPaid ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-orange-600">
                              <RotateCw className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
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