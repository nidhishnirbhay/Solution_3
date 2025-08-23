import { Link } from "wouter";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MapPin, Phone, Mail, ArrowLeft } from "lucide-react";

export default function ThankYou() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Thank You for Your Request!
            </h1>
            <p className="text-lg text-gray-600">
              We've received your round trip request successfully.
            </p>
          </div>

          {/* Main Card */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold mb-4">What happens next?</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium">Request Processing</h3>
                    <p className="text-gray-600 text-sm">
                      Our team will review your round trip request and match you with available drivers.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium">Driver Matching</h3>
                    <p className="text-gray-600 text-sm">
                      We'll find verified drivers who can accommodate your round trip requirements.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mt-0.5">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium">Contact & Confirmation</h3>
                    <p className="text-gray-600 text-sm">
                      Our team will contact you within 2-4 hours with available options and pricing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Need immediate assistance?</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>Call: 08069640595</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>Email: support@oyegaadi.com</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            
            <Link href="/one-way-rides">
              <Button className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Browse One Way Rides
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>
              Your request ID will be sent to your mobile number for tracking purposes.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}