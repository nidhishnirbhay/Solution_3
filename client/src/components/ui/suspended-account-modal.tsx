import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import { useLocation } from "wouter";

interface SuspendedAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuspendedAccountModal({ isOpen, onClose }: SuspendedAccountModalProps) {
  const [_, setLocation] = useLocation();

  const handleGoToLogin = () => {
    onClose();
    setLocation("/");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto bg-red-100 p-3 rounded-full">
            <Ban className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center text-red-600">Account Suspended</DialogTitle>
          <DialogDescription className="text-center">
            Your account has been suspended by the administrator. This is usually due to a violation of our terms of service or community guidelines.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-500">
            If you believe this is an error or would like to appeal this decision, please contact our support team at <span className="font-medium">support@oyegaadi.com</span> with your username and details about your situation.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleGoToLogin} className="w-full">
            Return to Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}