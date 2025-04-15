import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Car,
  FileCheck,
  Shield,
  ExternalLink,
} from "lucide-react";

export default function AdminKyc() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch KYC data
  const { data: pendingKyc, isLoading: loadingPending } = useQuery({
    queryKey: ["/api/kyc/pending"],
  });

  // Fetch all users to get their KYC status
  const { data: allUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Update KYC mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      remarks,
    }: {
      id: number;
      status: "approved" | "rejected";
      remarks: string;
    }) => {
      const res = await apiRequest("PUT", `/api/kyc/${id}`, { status, remarks });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "KYC updated",
        description: "The KYC verification has been updated successfully",
      });
      setSelectedKyc(null);
      setRemarks("");
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the KYC verification",
        variant: "destructive",
      });
    },
  });

  // Get users with KYC verified or not based on the active tab
  const getFilteredUsers = () => {
    if (!allUsers) return [];

    const filteredUsers = allUsers.filter((user: any) => {
      // Skip admins
      if (user.role === "admin") return false;

      // Search filter
      const searchMatch =
        searchQuery === "" ||
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.mobile.includes(searchQuery);

      // Tab filter
      if (activeTab === "pending") {
        return searchMatch && pendingKyc && pendingKyc.some((kyc: any) => kyc.userId === user.id);
      } else if (activeTab === "verified") {
        return searchMatch && user.isKycVerified;
      } else if (activeTab === "rejected") {
        return (
          searchMatch &&
          !user.isKycVerified &&
          !(pendingKyc && pendingKyc.some((kyc: any) => kyc.userId === user.id))
        );
      }

      return searchMatch;
    });

    return filteredUsers;
  };

  // Get KYC for a specific user from the pending KYC list
  const getUserKyc = (userId: number) => {
    if (!pendingKyc) return null;
    return pendingKyc.find((kyc: any) => kyc.userId === userId);
  };

  // Helper function to get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle KYC action (approve/reject)
  const handleKycAction = (kyc: any, action: "approve" | "reject") => {
    setSelectedKyc({
      ...kyc,
      action,
    });
  };

  // Submit KYC action
  const submitKycAction = () => {
    if (!selectedKyc) return;

    updateKycMutation.mutate({
      id: selectedKyc.id,
      status: selectedKyc.action === "approve" ? "approved" : "rejected",
      remarks,
    });
  };

  const filteredUsers = getFilteredUsers();

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="KYC Verification">
        {/* Search */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search KYC submissions..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pendingKyc && pendingKyc.length > 0 && (
                <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200">
                  {pendingKyc.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* KYC Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(loadingPending || loadingUsers) ? (
            Array(6)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="flex justify-end mt-4">
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <FileCheck className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No KYC submissions found</h3>
              <p className="text-muted-foreground">
                {activeTab === "pending"
                  ? "There are no pending KYC submissions to review"
                  : activeTab === "verified"
                  ? "No users with verified KYC yet"
                  : "No users with rejected KYC submissions"}
              </p>
            </div>
          ) : (
            filteredUsers.map((user: any) => {
              const pendingUserKyc = getUserKyc(user.id);
              
              return (
                <Card key={user.id} className={activeTab === "pending" ? "border-yellow-300" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{user.fullName}</CardTitle>
                          <CardDescription>@{user.username}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          activeTab === "pending"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : activeTab === "verified"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }`}
                      >
                        {activeTab === "pending"
                          ? "Pending"
                          : activeTab === "verified"
                          ? "Verified"
                          : "Rejected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{user.role === "driver" ? "Fleet Operator / Driver" : "Customer"}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          Document Type:{" "}
                          {pendingUserKyc?.documentType === "aadhaar"
                            ? "Aadhaar Card"
                            : pendingUserKyc?.documentType === "pan"
                            ? "PAN Card"
                            : "Unknown"}
                        </span>
                      </div>
                      {user.role === "driver" && pendingUserKyc?.vehicleType && (
                        <div className="flex items-center text-sm">
                          <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>
                            Vehicle: {pendingUserKyc.vehicleType} ({pendingUserKyc.vehicleNumber})
                          </span>
                        </div>
                      )}
                      {pendingUserKyc?.createdAt && (
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>
                            Submitted: {format(new Date(pendingUserKyc.createdAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    {activeTab === "pending" && pendingUserKyc && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                          onClick={() => setViewDocumentUrl(pendingUserKyc.documentUrl)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>View ID</span>
                        </Button>
                        
                        {pendingUserKyc.drivingLicenseUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => setViewDocumentUrl(pendingUserKyc.drivingLicenseUrl)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span>View License</span>
                          </Button>
                        )}
                        
                        {pendingUserKyc.selfieUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => setViewDocumentUrl(pendingUserKyc.selfieUrl)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span>View Selfie</span>
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between mt-4">
                      {activeTab === "pending" && pendingUserKyc && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center text-red-600"
                            onClick={() => handleKycAction(pendingUserKyc, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            <span>Reject</span>
                          </Button>
                          <Button
                            size="sm"
                            className="flex items-center bg-green-600 hover:bg-green-700"
                            onClick={() => handleKycAction(pendingUserKyc, "approve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span>Approve</span>
                          </Button>
                        </>
                      )}
                      
                      {activeTab === "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                        >
                          View History
                        </Button>
                      )}
                      
                      {activeTab === "verified" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto flex items-center text-green-600"
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          <span>Verified</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* KYC Action Dialog */}
        <Dialog open={!!selectedKyc} onOpenChange={(open) => !open && setSelectedKyc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedKyc?.action === "approve"
                  ? "Approve KYC Verification"
                  : "Reject KYC Verification"}
              </DialogTitle>
              <DialogDescription>
                {selectedKyc?.action === "approve"
                  ? "Are you sure you want to approve this KYC verification? The user will be marked as verified."
                  : "Are you sure you want to reject this KYC verification? Please provide a reason for rejection."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {selectedKyc && (
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(selectedKyc.user?.fullName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedKyc.user?.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedKyc.user?.role === "driver" ? "Fleet Operator / Driver" : "Customer"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Document Type:</span>{" "}
                      {selectedKyc.documentType === "aadhaar" ? "Aadhaar Card" : "PAN Card"}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Document ID:</span>{" "}
                      {selectedKyc.documentId}
                    </div>
                    {selectedKyc.user?.role === "driver" && (
                      <>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Vehicle Type:</span>{" "}
                          {selectedKyc.vehicleType}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Vehicle Number:</span>{" "}
                          {selectedKyc.vehicleNumber}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="remarks" className="text-sm font-medium">
                  {selectedKyc?.action === "approve" ? "Approval Notes (Optional)" : "Rejection Reason"}
                </label>
                <Textarea
                  id="remarks"
                  placeholder={
                    selectedKyc?.action === "approve"
                      ? "Add any notes for this approval (optional)"
                      : "Provide a reason for rejection"
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  required={selectedKyc?.action === "reject"}
                />
                {selectedKyc?.action === "reject" && remarks.length === 0 && (
                  <p className="text-sm text-red-500">Rejection reason is required</p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedKyc(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitKycAction}
                disabled={
                  updateKycMutation.isPending ||
                  (selectedKyc?.action === "reject" && remarks.length === 0)
                }
                variant={selectedKyc?.action === "approve" ? "default" : "destructive"}
              >
                {updateKycMutation.isPending
                  ? "Processing..."
                  : selectedKyc?.action === "approve"
                  ? "Approve KYC"
                  : "Reject KYC"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document View Dialog */}
        <Dialog open={!!viewDocumentUrl} onOpenChange={(open) => !open && setViewDocumentUrl(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>View Document</DialogTitle>
              <DialogDescription>
                Preview of the uploaded document
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {viewDocumentUrl ? (
                <div className="bg-gray-100 p-4 rounded-md text-center">
                  <p className="text-muted-foreground mb-4">
                    This is a simulated document view. In a production environment, this would display the actual document.
                  </p>
                  <div className="p-10 border rounded-md mb-4">
                    <FileText className="h-20 w-20 mx-auto text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground break-all">
                      {viewDocumentUrl}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="flex items-center"
                    onClick={() => window.open(viewDocumentUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    <span>Open in New Tab</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p>Document not available</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                onClick={() => setViewDocumentUrl(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </RequireAuth>
  );
}
