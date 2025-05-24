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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  ChevronDown,
  Search,
  MoreHorizontal,
  Star,
  ShieldCheck,
  ShieldX,
  UserCog,
  Ban,
  CheckCircle,
  Filter,
} from "lucide-react";

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"suspend" | "unsuspend" | "updateKyc">("suspend");
  const { toast } = useToast();

  // Fetch users data
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      try {
        const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
        if (!res.ok) {
          const errorData = await res.text();
          console.error("Error response:", errorData);
          throw new Error(errorData || "Failed to update user");
        }
        return await res.json();
      } catch (error) {
        console.error("Update user error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
      setConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the user",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search query and active tab, then sort by most recent first
  const filteredUsers = users
    ? users.filter((user: any) => {
        // Search filter
        const searchMatch =
          searchQuery === "" ||
          user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.mobile && user.mobile.includes(searchQuery));

        // Tab filter
        if (activeTab === "all") return searchMatch;
        if (activeTab === "customers") return user.role === "customer" && searchMatch;
        if (activeTab === "drivers") return user.role === "driver" && searchMatch;
        if (activeTab === "suspended") return user.isSuspended && searchMatch;

        return searchMatch;
      })
      // Sort by most recent first (highest ID assuming sequential creation)
      .sort((a: any, b: any) => {
        // Sort by creation date if available, otherwise by ID
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // Fallback to ID-based sorting (higher ID = more recent)
        return b.id - a.id;
      })
    : [];

  const handleAction = (user: any, action: "suspend" | "unsuspend" | "updateKyc") => {
    setSelectedUser(user);
    setActionType(action);
    setConfirmDialogOpen(true);
  };

  const executeAction = () => {
    if (!selectedUser) return;

    if (actionType === "suspend") {
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: { isSuspended: true },
      });
    } else if (actionType === "unsuspend") {
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: { isSuspended: false },
      });
    } else if (actionType === "updateKyc") {
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: { isKycVerified: !selectedUser.isKycVerified },
      });
    }
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

  // Render user role badge
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            Admin
          </Badge>
        );
      case "driver":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Driver
          </Badge>
        );
      case "customer":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Customer
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {role}
          </Badge>
        );
    }
  };

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminLayout title="User Management">
        {/* Search and filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
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
                  All Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("customers")}>
                  Customers Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("drivers")}>
                  Drivers Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("suspended")}>
                  Suspended Users
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Users {filteredUsers?.length > 0 && `(${filteredUsers.length})`}
            </CardTitle>
            <CardDescription>
              Manage all registered users on the OyeGaadi platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredUsers?.length === 0 ? (
              <div className="text-center py-10">
                <UserCog className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "No users match the selected filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.fullName}</div>
                              <div className="text-sm text-muted-foreground">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{renderRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.isKycVerified ? (
                            <div className="flex items-center">
                              <ShieldCheck className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-green-600">Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <ShieldX className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="text-yellow-600">Not Verified</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                            <span>{user.averageRating ? user.averageRating.toFixed(1) : "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.mobile}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleAction(user, "updateKyc")}
                              >
                                {user.isKycVerified ? (
                                  <>
                                    <ShieldX className="h-4 w-4 mr-2" />
                                    <span>Mark KYC as Unverified</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    <span>Mark KYC as Verified</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              {user.isSuspended ? (
                                <DropdownMenuItem
                                  onClick={() => handleAction(user, "unsuspend")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  <span>Unsuspend User</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleAction(user, "suspend")}
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  <span>Suspend User</span>
                                </DropdownMenuItem>
                              )}
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

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "suspend"
                  ? "Suspend User"
                  : actionType === "unsuspend"
                  ? "Unsuspend User"
                  : "Update KYC Status"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "suspend"
                  ? "Are you sure you want to suspend this user? They will no longer be able to use the platform."
                  : actionType === "unsuspend"
                  ? "Are you sure you want to unsuspend this user? They will regain access to the platform."
                  : selectedUser?.isKycVerified
                  ? "Are you sure you want to mark this user's KYC as unverified?"
                  : "Are you sure you want to mark this user's KYC as verified?"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedUser && (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedUser.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedUser.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      {renderRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={executeAction}
                disabled={updateUserMutation.isPending}
                variant={actionType === "suspend" ? "destructive" : "default"}
              >
                {updateUserMutation.isPending
                  ? "Processing..."
                  : actionType === "suspend"
                  ? "Suspend"
                  : actionType === "unsuspend"
                  ? "Unsuspend"
                  : selectedUser?.isKycVerified
                  ? "Mark as Unverified"
                  : "Mark as Verified"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </RequireAuth>
  );
}
