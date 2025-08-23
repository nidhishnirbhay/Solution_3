import { cn } from "@/lib/utils";

interface StepProps {
  number: number;
  title: string;
  description: string;
  type: "traveler" | "driver";
}

function Step({ number, title, description, type }: StepProps) {
  return (
    <div className="flex">
      <div 
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4",
          type === "traveler" ? "bg-primary" : "bg-blue-500"
        )}
      >
        <span className="text-white font-medium">{number}</span>
      </div>
      <div>
        <h4 className="font-medium mb-1">{title}</h4>
        <p className="text-neutral-600 text-sm">{description}</p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const travelerSteps: StepProps[] = [
    {
      number: 1,
      title: "Register & Complete KYC",
      description: "Sign up and verify your identity for a safer community.",
      type: "traveler"
    },
    {
      number: 2,
      title: "Search Available Rides",
      description: "Find rides that match your route, date, and preferences.",
      type: "traveler"
    },
    {
      number: 3,
      title: "Book & Pay Booking Fee",
      description: "Secure your seat with a ₹49 booking fee.",
      type: "traveler"
    },
    {
      number: 4,
      title: "Travel & Rate Driver",
      description: "Enjoy your journey and share your experience.",
      type: "traveler"
    }
  ];

  const driverSteps: StepProps[] = [
    {
      number: 1,
      title: "Register as Driver",
      description: "Sign up and submit your vehicle information.",
      type: "driver"
    },
    {
      number: 2,
      title: "Complete KYC Verification",
      description: "Upload required documents for verification.",
      type: "driver"
    },
    {
      number: 3,
      title: "Publish Your Rides",
      description: "Set your routes, dates, prices, and seat availability.",
      type: "driver"
    },
    {
      number: 4,
      title: "Get Bookings & Drive",
      description: "Receive booking notifications and provide great service.",
      type: "driver"
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">How OyeGaadi Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div className="md:border-r border-neutral-200 md:pr-8">
            <h3 className="text-xl font-semibold text-center mb-6">For Travelers</h3>
            <div className="space-y-8">
              {travelerSteps.map((step, index) => (
                <Step key={index} {...step} />
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-center mb-6">For Drivers</h3>
            <div className="space-y-8">
              {driverSteps.map((step, index) => (
                <Step key={index} {...step} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
