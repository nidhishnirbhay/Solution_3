import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { RequireAuth } from "@/components/layout/require-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Check, 
  X, 
  AlertCircle,
  Clock
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Common schema elements
const documentTypeSchema = z.enum(["aadhaar", "pan"]);
const documentIdSchema = z.string().min(1, { message: "Document ID is required" });
const documentUrlSchema = z.string().min(1, { message: "Document URL/file is required" });

// Driver KYC schema
const driverKycSchema = z.object({
  documentType: documentTypeSchema,
  documentId: documentIdSchema,
  documentUrl: documentUrlSchema,
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  vehicleNumber: z.string().min(1, { message: "Vehicle number is required" }),
  drivingLicenseUrl: z.string().min(1, { message: "Driving license is required" }),
  selfieUrl: z.string().optional(),
});

// Customer KYC schema
const customerKycSchema = z.object({
  documentType: documentTypeSchema,
  documentId: documentIdSchema,
  documentUrl: documentUrlSchema,
  emergencyContact: z.string().optional(),
  selfieUrl: z.string().optional(),
});

type DriverKycFormValues = z.infer<typeof driverKycSchema>;
type CustomerKycFormValues = z.infer<typeof customerKycSchema>;

export default function KycVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // For demonstration, we're simulating file uploads with URLs
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  // Get user's KYC status
  const { data: kycDocuments, isLoading: loadingKyc } = useQuery({
    queryKey: ["/api/kyc/my-kyc"],
    enabled: !!user,
  });

  // Create driver KYC form
  const driverForm = useForm<DriverKycFormValues>({
    resolver: zodResolver(driverKycSchema),
    defaultValues: {
      documentType: "aadhaar",
      documentId: "",
      documentUrl: "",
      vehicleType: "",
      vehicleNumber: "",
      drivingLicenseUrl: "",
      selfieUrl: "",
    },
  });

  // Create customer KYC form
  const customerForm = useForm<CustomerKycFormValues>({
    resolver: zodResolver(customerKycSchema),
    defaultValues: {
      documentType: "aadhaar",
      documentId: "",
      documentUrl: "",
      emergencyContact: "",
      selfieUrl: "",
    },
  });

  // Submit KYC mutation
  const submitKycMutation = useMutation({
    mutationFn: async (data: any) => {
      // Make sure we have the correct data format
      const formattedData = {
        ...data,
        // Convert to the format expected by the server
        userId: user?.id // Ensure userId is included and is a number
      };
      
      console.log("Submitting KYC with data:", formattedData);
      
      try {
        // Validate critical fields before sending
        if (!formattedData.documentType) {
          throw new Error("Document type is required");
        }
        
        if (!formattedData.documentId) {
          throw new Error("Document number is required");
        }
        
        if (!formattedData.userId) {
          throw new Error("User identification is missing. Please try logging out and back in.");
        }
        
        const res = await apiRequest("POST", "/api/kyc", formattedData);
        
        if (!res.ok) {
          // Try to get a detailed error message from the response
          try {
            const errorData = await res.json();
            throw new Error(errorData.error || "Server error during KYC submission");
          } catch (parseError) {
            // If we can't parse the error JSON, use a generic message with status
            throw new Error(`KYC submission failed with status ${res.status}`);
          }
        }
        
        return res.json();
      } catch (error) {
        console.error("KYC API request error:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to submit KYC. Please try again.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/my-kyc"] });
      toast({
        title: "KYC submitted",
        description: "Your KYC documents have been submitted for verification",
      });
      
      // Reset forms
      driverForm.reset();
      customerForm.reset();
    },
    onError: (error: any) => {
      console.error("KYC submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your KYC",
        variant: "destructive",
      });
    },
  });

  // Handle actual file upload
  const handleFileUpload = async (fieldName: string, form: any, setUploading: (val: boolean) => void, file: File) => {
    setUploading(true);
    
    try {
      // Create form data to submit the file
      const formData = new FormData();
      formData.append('file', file);
      
      // Send the file to the server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      // Get the URL of the uploaded file
      const data = await response.json();
      const url = data.url;
      
      // Set the URL in the form
      form.setValue(fieldName, url);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload the file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Submit handler for driver
  const onDriverSubmit = (data: DriverKycFormValues) => {
    submitKycMutation.mutate(data);
  };

  // Submit handler for customer
  const onCustomerSubmit = (data: CustomerKycFormValues) => {
    submitKycMutation.mutate(data);
  };

  // Get the latest KYC status
  const getLatestKycStatus = () => {
    if (!kycDocuments || !Array.isArray(kycDocuments) || kycDocuments.length === 0) {
      return null;
    }
    
    // Sort by creation date and get the latest
    return [...kycDocuments].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };
  
  const latestKyc = getLatestKycStatus();

  // Render status badge based on KYC status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500 flex items-center gap-1">
            <Check className="h-3 w-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500 flex items-center gap-1">
            <X className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  return (
    <RequireAuth>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="bg-gradient-to-r from-primary to-blue-500 py-8">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                KYC Verification
              </h1>
              <p className="text-white text-opacity-90">
                Complete your identity verification to use all features.
              </p>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            {loadingKyc ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KYC Status Card */}
                <Card className="mb-8">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                          <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">KYC Status</h2>
                          <p className="text-muted-foreground">
                            {user?.isKycVerified ? (
                              "Your KYC is verified. You have full access to all features."
                            ) : latestKyc ? (
                              latestKyc.status === "pending" ? (
                                "Your KYC is under review. This usually takes 24-48 hours."
                              ) : latestKyc.status === "rejected" ? (
                                "Your KYC verification was rejected. Please review the details below and submit again."
                              ) : (
                                "Your KYC is being processed."
                              )
                            ) : (
                              "You haven't submitted your KYC yet. Please complete the form below to verify your identity."
                            )}
                          </p>
                        </div>
                      </div>
                      <div>
                        {user?.isKycVerified ? (
                          <Badge variant="outline" className="text-green-500 border-green-500 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          latestKyc && renderStatusBadge(latestKyc.status)
                        )}
                      </div>
                    </div>

                    {latestKyc && (
                      <>
                        {latestKyc.status === "rejected" && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Verification Failed</AlertTitle>
                            <AlertDescription>
                              {latestKyc.remarks || "Your KYC verification was rejected. Please submit again with correct information."}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {latestKyc.status === "pending" && (
                          <Alert className="mt-4 border-yellow-500 text-yellow-700 bg-yellow-50">
                            <Clock className="h-4 w-4" />
                            <AlertTitle>Verification In Progress</AlertTitle>
                            <AlertDescription>
                              Your documents are being reviewed by our team. This typically takes 24-48 hours. You'll receive a notification when verification is complete.
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {latestKyc.status === "approved" && (
                          <Alert className="mt-4 border-green-500 text-green-700 bg-green-50">
                            <Check className="h-4 w-4" />
                            <AlertTitle>Verification Successful</AlertTitle>
                            <AlertDescription>
                              Your KYC verification is complete. You can now access all platform features including publishing rides and booking services.
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* KYC Submission */}
                {!user?.isKycVerified && (
                  user?.role === "driver" ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Driver KYC Verification</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Form {...driverForm}>
                          <form onSubmit={driverForm.handleSubmit(onDriverSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                                
                                <FormField
                                  control={driverForm.control}
                                  name="documentType"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>ID Document Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select document type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                                          <SelectItem value="pan">PAN Card</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={driverForm.control}
                                  name="documentId"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>ID Document Number</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter your document number" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={driverForm.control}
                                  name="documentUrl"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Upload ID Document</FormLabel>
                                      <div className="flex gap-2">
                                        <Input
                                          type="file"
                                          className="hidden"
                                          id="document-upload"
                                          onChange={() => simulateFileUpload("documentUrl", driverForm, setUploadingDocument)}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => document.getElementById("document-upload")?.click()}
                                          disabled={uploadingDocument}
                                        >
                                          {uploadingDocument ? "Uploading..." : "Choose File"}
                                        </Button>
                                        <Input
                                          value={field.value}
                                          readOnly
                                          placeholder="No file chosen"
                                          className="flex-1"
                                        />
                                      </div>
                                      <FormDescription>
                                        Upload a clear scan or photo of your {driverForm.watch("documentType") === "aadhaar" ? "Aadhaar" : "PAN"} card.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={driverForm.control}
                                  name="selfieUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Upload Selfie (Optional)</FormLabel>
                                      <div className="flex gap-2">
                                        <Input
                                          type="file"
                                          className="hidden"
                                          id="selfie-upload"
                                          onChange={() => simulateFileUpload("selfieUrl", driverForm, setUploadingSelfie)}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => document.getElementById("selfie-upload")?.click()}
                                          disabled={uploadingSelfie}
                                        >
                                          {uploadingSelfie ? "Uploading..." : "Choose File"}
                                        </Button>
                                        <Input
                                          value={field.value}
                                          readOnly
                                          placeholder="No file chosen"
                                          className="flex-1"
                                        />
                                      </div>
                                      <FormDescription>
                                        Upload a recent selfie to improve trust with customers.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div>
                                <h3 className="text-lg font-medium mb-4">Vehicle Information</h3>
                                
                                <FormField
                                  control={driverForm.control}
                                  name="vehicleType"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Vehicle Type</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. Sedan, SUV, Hatchback" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={driverForm.control}
                                  name="vehicleNumber"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Vehicle Number</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. DL01AB1234" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={driverForm.control}
                                  name="drivingLicenseUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Upload Driving License</FormLabel>
                                      <div className="flex gap-2">
                                        <Input
                                          type="file"
                                          className="hidden"
                                          id="license-upload"
                                          onChange={() => simulateFileUpload("drivingLicenseUrl", driverForm, setUploadingLicense)}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => document.getElementById("license-upload")?.click()}
                                          disabled={uploadingLicense}
                                        >
                                          {uploadingLicense ? "Uploading..." : "Choose File"}
                                        </Button>
                                        <Input
                                          value={field.value}
                                          readOnly
                                          placeholder="No file chosen"
                                          className="flex-1"
                                        />
                                      </div>
                                      <FormDescription>
                                        Upload a clear scan or photo of your driving license (both sides).
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Important</AlertTitle>
                              <AlertDescription>
                                Your KYC documents will be reviewed by our team. This usually takes 24-48 hours.
                                You will be able to publish rides only after your KYC is approved.
                              </AlertDescription>
                            </Alert>

                            <div className="flex justify-end">
                              <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90"
                                disabled={submitKycMutation.isPending}
                              >
                                {submitKycMutation.isPending ? "Submitting..." : "Submit KYC"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Customer KYC Verification</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Form {...customerForm}>
                          <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <FormField
                                  control={customerForm.control}
                                  name="documentType"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>ID Document Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select document type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                                          <SelectItem value="pan">PAN Card</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={customerForm.control}
                                  name="documentId"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>ID Document Number</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter your document number" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={customerForm.control}
                                  name="documentUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Upload ID Document</FormLabel>
                                      <div className="flex gap-2">
                                        <Input
                                          type="file"
                                          className="hidden"
                                          id="customer-document-upload"
                                          onChange={() => simulateFileUpload("documentUrl", customerForm, setUploadingDocument)}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => document.getElementById("customer-document-upload")?.click()}
                                          disabled={uploadingDocument}
                                        >
                                          {uploadingDocument ? "Uploading..." : "Choose File"}
                                        </Button>
                                        <Input
                                          value={field.value}
                                          readOnly
                                          placeholder="No file chosen"
                                          className="flex-1"
                                        />
                                      </div>
                                      <FormDescription>
                                        Upload a clear scan or photo of your {customerForm.watch("documentType") === "aadhaar" ? "Aadhaar" : "PAN"} card.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div>
                                <FormField
                                  control={customerForm.control}
                                  name="emergencyContact"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Emergency Contact (Optional)</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter emergency contact number" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        This number will be contacted in case of emergencies.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={customerForm.control}
                                  name="selfieUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Upload Selfie (Optional)</FormLabel>
                                      <div className="flex gap-2">
                                        <Input
                                          type="file"
                                          className="hidden"
                                          id="customer-selfie-upload"
                                          onChange={() => simulateFileUpload("selfieUrl", customerForm, setUploadingSelfie)}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => document.getElementById("customer-selfie-upload")?.click()}
                                          disabled={uploadingSelfie}
                                        >
                                          {uploadingSelfie ? "Uploading..." : "Choose File"}
                                        </Button>
                                        <Input
                                          value={field.value}
                                          readOnly
                                          placeholder="No file chosen"
                                          className="flex-1"
                                        />
                                      </div>
                                      <FormDescription>
                                        Upload a recent selfie to improve trust with drivers.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Important</AlertTitle>
                              <AlertDescription>
                                Your KYC documents will be reviewed by our team. This usually takes 24-48 hours.
                                You can still book one ride while your KYC is pending.
                              </AlertDescription>
                            </Alert>

                            <div className="flex justify-end">
                              <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90"
                                disabled={submitKycMutation.isPending}
                              >
                                {submitKycMutation.isPending ? "Submitting..." : "Submit KYC"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )
                )}
                
                {/* KYC History */}
                {kycDocuments && Array.isArray(kycDocuments) && kycDocuments.length > 0 && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>KYC History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {kycDocuments.map((kyc: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between mb-2">
                              <span className="font-medium">Submitted on {new Date(kyc.createdAt).toLocaleDateString()}</span>
                              {renderStatusBadge(kyc.status)}
                            </div>
                            <div>
                              <p className="text-sm">
                                Document Type: {kyc.documentType === "aadhaar" ? "Aadhaar Card" : "PAN Card"}
                              </p>
                              {kyc.remarks && (
                                <div className="mt-2 text-sm bg-gray-50 p-2 rounded border">
                                  <span className="font-medium">Remarks:</span> {kyc.remarks}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
