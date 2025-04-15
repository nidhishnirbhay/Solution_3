import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { AuthModal } from "@/components/ui/auth-modal";
import { useState } from "react";

export function CtaSection() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleFindRideClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
  };

  const handleOfferRideClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
  };

  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Ready to start your journey?
        </h2>
        <p className="text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
          Join thousands of travelers and drivers on OyeGaadi for affordable, convenient, and secure one-way rides.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {user ? (
            <>
              <Link href="/find-rides">
                <Button className="bg-white text-primary hover:bg-neutral-100">
                  Find a Ride
                </Button>
              </Link>
              
              {user.role === "driver" ? (
                <Link href="/publish-ride">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                    Offer a Ride
                  </Button>
                </Link>
              ) : (
                <Link href="/kyc-verification">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                    Become a Driver
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <Button 
                className="bg-white text-primary hover:bg-neutral-100"
                onClick={handleFindRideClick}
              >
                Find a Ride
              </Button>
              
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleOfferRideClick}
              >
                Offer a Ride
              </Button>
            </>
          )}
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </section>
  );
}
