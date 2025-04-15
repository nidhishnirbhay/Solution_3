import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IdCard, Car, Star } from "lucide-react";

interface KycFeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function KycFeature({ icon, title, description }: KycFeatureProps) {
  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="bg-orange-100 p-3 rounded-full inline-flex mb-4">
          {icon}
        </div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-neutral-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export function KycInfo() {
  const features = [
    {
      icon: <IdCard className="h-5 w-5 text-primary" />,
      title: "Identity Verification",
      description: "We verify government IDs to ensure everyone on the platform is who they claim to be."
    },
    {
      icon: <Car className="h-5 w-5 text-primary" />,
      title: "Vehicle Verification",
      description: "All driver vehicles are verified for safety and compliance with regulations."
    },
    {
      icon: <Star className="h-5 w-5 text-primary" />,
      title: "Rating System",
      description: "Our two-way rating system helps maintain quality and safety standards."
    }
  ];

  return (
    <section className="py-12 bg-orange-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Trust & Safety First</h2>
          <p className="text-neutral-700 mb-8">
            At OyeGaadi, we prioritize safety through our comprehensive KYC verification process for all users.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {features.map((feature, index) => (
              <KycFeature
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
          
          <div className="mt-8">
            <Link href="/kyc-verification">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Learn More About KYC
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
