import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireAuth } from "@/components/layout/require-auth";
import {
  Users,
  Car,
  CalendarCheck,
  FileCheck,
  Star,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function AdminDashboard() {
  // Fetch summary data
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: rides, isLoading: loadingRides } = useQuery({
    queryKey: ["/api/admin/rides"],
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["/api/admin/bookings"],
  });

  const { data: pendingKyc, isLoading: loadingKyc } = useQuery({
    queryKey: ["/api/kyc/pending"],
  });

  // Count customers and drivers
  const getCustomerCount = () => {
    if (!users) return 0;
    return users.filter(user => user.role === "customer").length;
  };

  const getDriverCount = () => {
    if (!users) return 0;
    return users.filter(user => user.role === "driver").length;
  };

  // Count rides by type
  const getOneWayRideCount = () => {
    if (!rides) return 0;
    return rides.filter(ride => ride.rideType === "one-way").length;
  };

  const getSharingRideCount = () => {
    if (!rides) return 0;
    return rides.filter(ride => ride.rideType === "sharing").length;
  };

  // Count bookings by status
  const getActiveBookingCount = () => {
    if (!bookings) return 0;
    return bookings.filter(booking => 
      booking.status === "pending" || booking.status === "confirmed"
    ).length;
  };

  const getCompletedBookingCount = () => {
    if (!bookings) return 0;
    return bookings.filter(booking => booking.status === "completed").length;
  };

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* User Stats Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{users?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {loadingUsers ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>
                    {getCustomerCount()} customers, {getDriverCount()} drivers
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Rides Stats Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingRides ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{rides?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {loadingRides ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>
                    {getOneWayRideCount()} one-way, {getSharingRideCount()} sharing
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Bookings Stats Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bookings</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{bookings?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {loadingBookings ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>
                    {getActiveBookingCount()} active, {getCompletedBookingCount()} completed
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Pending KYC Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingKyc ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{pendingKyc?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Verification documents awaiting review
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending KYC Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Pending KYC Applications</CardTitle>
              <CardDescription>
                New KYC applications requiring verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKyc ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-9 w-16" />
                    </div>
                  ))}
                </div>
              ) : pendingKyc?.length === 0 ? (
                <div className="text-center py-6">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">No pending KYC requests</h3>
                  <p className="text-muted-foreground">All verification documents have been processed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingKyc?.slice(0, 5).map((kyc) => (
                    <div key={kyc.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{kyc.user?.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {kyc.user?.role === "driver" ? "Driver" : "Customer"} • 
                          {kyc.documentType === "aadhaar" ? " Aadhaar" : " PAN"}
                        </div>
                      </div>
                      <Link href="/admin/kyc">
                        <Button size="sm">
                          Review
                        </Button>
                      </Link>
                    </div>
                  ))}
                  
                  {pendingKyc && pendingKyc.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href="/admin/kyc">
                        <Button variant="link" className="text-primary">
                          View {pendingKyc.length - 5} more <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>
                Latest ride bookings on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : bookings?.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">No bookings yet</h3>
                  <p className="text-muted-foreground">Bookings will appear here once customers start reserving rides.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings?.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {booking.ride.fromLocation} to {booking.ride.toLocation}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Booked by {booking.customer.fullName} • 
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          booking.status === "completed" 
                            ? "bg-green-100 text-green-700"
                            : booking.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : booking.status === "confirmed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {bookings && bookings.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href="/admin/bookings">
                        <Button variant="link" className="text-primary">
                          View all bookings <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Alerts */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">System Alerts</h2>
          
          {pendingKyc && pendingKyc.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required: KYC Verification</AlertTitle>
              <AlertDescription>
                There {pendingKyc.length === 1 ? "is" : "are"} {pendingKyc.length} pending KYC {pendingKyc.length === 1 ? "request" : "requests"} that need your verification.
                <Link href="/admin/kyc">
                  <Button variant="link" className="p-0 h-auto text-primary ml-2">
                    Review now
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </AdminLayout>
    </RequireAuth>
  );
}
