import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Car, FileCheck, CalendarCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AdminDashboardProps {
  title?: string;
}

export default function AdminDashboard({ title = "Dashboard" }: AdminDashboardProps) {
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users/stats"],
  });

  const { data: rides, isLoading: loadingRides } = useQuery({
    queryKey: ["/api/admin/rides/stats"],
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["/api/admin/bookings/stats"],
  });

  const { data: kycVerifications, isLoading: loadingKyc } = useQuery({
    queryKey: ["/api/admin/kyc/stats"],
  });

  // Handle specific section views
  const renderContent = () => {
    if (title === "Users") {
      return (
        <div className="mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              User management interface is under development. Check back soon.
            </AlertDescription>
          </Alert>
        </div>
      );
    } else if (title === "Rides") {
      return (
        <div className="mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              Ride management interface is under development. Check back soon.
            </AlertDescription>
          </Alert>
        </div>
      );
    } else if (title === "Bookings") {
      return (
        <div className="mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              Booking management interface is under development. Check back soon.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    // Default dashboard content
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Users Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {users?.total || 0}
                  <div className="text-xs text-muted-foreground mt-1">
                    Drivers: {users?.drivers || 0}, Customers: {users?.customers || 0}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rides Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingRides ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {rides?.total || 0}
                  <div className="text-xs text-muted-foreground mt-1">
                    Active: {rides?.active || 0}, Completed: {rides?.completed || 0}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {bookings?.total || 0}
                  <div className="text-xs text-muted-foreground mt-1">
                    Confirmed: {bookings?.confirmed || 0}, Pending: {bookings?.pending || 0}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KYC Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">KYC Verifications</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingKyc ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {kycVerifications?.total || 0}
                  <div className="text-xs text-muted-foreground mt-1">
                    Pending: {kycVerifications?.pending || 0}, Approved: {kycVerifications?.approved || 0}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Recent KYC Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Recent KYC Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKyc ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : kycVerifications?.recent?.length > 0 ? (
                <div className="space-y-2">
                  {kycVerifications.recent.map((kyc: any) => (
                    <div 
                      key={kyc.id} 
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <div className="font-medium">{kyc.user?.fullName || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(kyc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        kyc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        kyc.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {kyc.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent KYC requests</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : bookings?.recent?.length > 0 ? (
                <div className="space-y-2">
                  {bookings.recent.map((booking: any) => (
                    <div 
                      key={booking.id} 
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <div className="font-medium">
                          {booking.ride?.fromLocation} to {booking.ride?.toLocation}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          By {booking.customer?.fullName || 'Unknown'} • 
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {booking.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent bookings</p>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  return (
    <AdminLayout title={title}>
      {renderContent()}
    </AdminLayout>
  );
}