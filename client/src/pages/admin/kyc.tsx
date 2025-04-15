import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { FileCheck, X, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminKyc() {
  const { toast } = useToast();
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch KYC verifications
  const { data: kycVerifications, isLoading } = useQuery({
    queryKey: ["/api/admin/kyc"],
  });

  // Update KYC status mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/kyc/${id}`, { status, remarks });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update KYC status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      toast({
        title: "KYC status updated",
        description: "The KYC verification status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the KYC status",
        variant: "destructive",
      });
    }
  });

  // Handle approve KYC
  const handleApprove = (kyc: any) => {
    updateKycMutation.mutate({
      id: kyc.id,
      status: "approved",
      remarks: remarks || "Your KYC has been approved."
    });
  };

  // Handle reject KYC
  const handleReject = (kyc: any) => {
    if (!remarks) {
      toast({
        title: "Remarks required",
        description: "Please provide remarks explaining why the KYC was rejected.",
        variant: "destructive",
      });
      return;
    }

    updateKycMutation.mutate({
      id: kyc.id,
      status: "rejected",
      remarks: remarks
    });
  };

  // Filter KYC verifications by status
  const filteredKyc = kycVerifications 
    ? filterStatus === "all" 
      ? kycVerifications 
      : kycVerifications.filter((kyc: any) => kyc.status === filterStatus)
    : [];

  return (
    <AdminLayout title="KYC Verifications">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">
            <div className="flex items-center">
              <FileCheck className="mr-2 h-5 w-5" />
              KYC Verification Management
            </div>
          </CardTitle>
          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verifications</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredKyc.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Submitted On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKyc.map((kyc: any) => (
                    <TableRow key={kyc.id}>
                      <TableCell>{kyc.id}</TableCell>
                      <TableCell>
                        {kyc.user?.fullName || "Unknown"}
                        <div className="text-xs text-muted-foreground">
                          {kyc.user?.role || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {kyc.documentType === "aadhaar" ? "Aadhaar Card" : "PAN Card"}
                        <div className="text-xs text-muted-foreground">
                          {kyc.documentId || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(kyc.createdAt).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">
                          {new Date(kyc.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          kyc.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          kyc.status === "approved" ? "bg-green-100 text-green-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {kyc.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedKyc(kyc);
                                setRemarks(kyc.remarks || "");
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>KYC Verification Details</DialogTitle>
                            </DialogHeader>
                            {selectedKyc && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">User</Label>
                                    <div className="font-medium">{selectedKyc.user?.fullName || "Unknown"}</div>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Role</Label>
                                    <div className="font-medium capitalize">{selectedKyc.user?.role || "N/A"}</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Document Type</Label>
                                    <div className="font-medium">
                                      {selectedKyc.documentType === "aadhaar" ? "Aadhaar Card" : "PAN Card"}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Document ID</Label>
                                    <div className="font-medium">{selectedKyc.documentId || "N/A"}</div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-muted-foreground">Document URL</Label>
                                  <div className="mt-1">
                                    <a 
                                      href={selectedKyc.documentUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      View Document
                                    </a>
                                  </div>
                                </div>

                                {selectedKyc.user?.role === "driver" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-muted-foreground">Vehicle Type</Label>
                                        <div className="font-medium">{selectedKyc.vehicleType || "N/A"}</div>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Vehicle Number</Label>
                                        <div className="font-medium">{selectedKyc.vehicleNumber || "N/A"}</div>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-muted-foreground">Driving License</Label>
                                      <div className="mt-1">
                                        <a 
                                          href={selectedKyc.drivingLicenseUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          View Driving License
                                        </a>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {selectedKyc.selfieUrl && (
                                  <div>
                                    <Label className="text-muted-foreground">Selfie</Label>
                                    <div className="mt-1">
                                      <a 
                                        href={selectedKyc.selfieUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        View Selfie
                                      </a>
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <Label htmlFor="remarks">Remarks</Label>
                                  <Textarea 
                                    id="remarks"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Add remarks or reason for approval/rejection"
                                    className="mt-1"
                                    disabled={selectedKyc.status !== "pending" && updateKycMutation.isPending}
                                  />
                                </div>

                                {selectedKyc.status === "pending" && (
                                  <div className="flex justify-end space-x-3 mt-4">
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleReject(selectedKyc)}
                                      disabled={updateKycMutation.isPending}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                    
                                    <Button
                                      onClick={() => handleApprove(selectedKyc)}
                                      disabled={updateKycMutation.isPending}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No KYC verifications found matching the selected filter.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}