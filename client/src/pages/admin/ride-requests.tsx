import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RequireAuth } from "@/components/layout/require-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Phone, MapPin, Calendar, Users, DollarSign, MessageSquare, Clock } from "lucide-react";

interface RideRequest {
  id: number;
  userId: number;
  fromLocation: string;
  toLocation: string;
  preferredDate: string;
  preferredTime?: string;
  numberOfPassengers: number;
  maxBudget?: number;
  additionalNotes?: string;
  contactNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    fullName: string;
    mobile: string;
    role: string;
  };
}

export default function AdminRideRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/admin/ride-requests"],
    queryFn: () => fetch("/api/admin/ride-requests", { credentials: "include" }).then(res => res.json())
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest('PATCH', `/api/admin/ride-requests/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Ride request status has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ride-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const filteredRequests = requests?.filter((request: RideRequest) => {
    if (statusFilter === "all") return true;
    return request.status.toLowerCase() === statusFilter.toLowerCase();
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: "secondary" as const, label: "Pending" },
      responded: { variant: "default" as const, label: "Responded" },
      closed: { variant: "outline" as const, label: "Closed" }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusUpdate = (requestId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: requestId, status: newStatus });
  };

  if (isLoading) {
    return (
      <RequireAuth allowedRoles={["admin"]}>
        <AdminLayout title="Ride Requests">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">Loading ride requests...</div>
          </div>
        </AdminLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="Ride Requests">
        {/* Header with stats and filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex gap-4">
            <div className="text-sm">
              <span className="font-medium">{filteredRequests.length}</span> requests
            </div>
            <div className="text-sm text-muted-foreground">
              Pending: {requests?.filter((r: RideRequest) => r.status === 'pending').length || 0}
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No ride requests found</h3>
              <p className="text-muted-foreground">
                {statusFilter === "all" 
                  ? "No ride requests have been submitted yet."
                  : `No ${statusFilter} requests found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredRequests.map((request: RideRequest) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        {request.fromLocation} → {request.toLocation}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(request.createdAt), 'dd MMM yyyy, hh:mm a')}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select
                        value={request.status}
                        onValueChange={(status) => handleStatusUpdate(request.id, status)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Customer Details */}
                    <div>
                      <h4 className="font-medium mb-3">Customer Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Name:</span>
                          <span>{request.user?.fullName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{request.contactNumber}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Trip Details */}
                    <div>
                      <h4 className="font-medium mb-3">Trip Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(request.preferredDate), 'dd MMM yyyy')}
                            {request.preferredTime && ` at ${request.preferredTime}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{request.numberOfPassengers} passenger(s)</span>
                        </div>
                        {request.maxBudget && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Max Budget: ₹{request.maxBudget}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Notes */}
                  {request.additionalNotes && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                        {request.additionalNotes}
                      </p>
                    </div>
                  )}
                  
                  {/* Contact Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`tel:${request.contactNumber}`)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call Customer
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`sms:${request.contactNumber}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Send SMS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AdminLayout>
    </RequireAuth>
  );
}