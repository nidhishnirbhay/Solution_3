import { ShieldCheck, BanknoteIcon, TrafficCone } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      title: "Verified Drivers",
      description: "Every driver undergoes KYC verification. Travel with peace of mind."
    },
    {
      icon: <BanknoteIcon className="h-6 w-6 text-primary" />,
      title: "Affordable Pricing",
      description: "Transparent pricing with no hidden charges. Pay only for what you use."
    },
    {
      icon: <TrafficCone className="h-6 w-6 text-primary" />,
      title: "One-Way Journeys",
      description: "Don't pay for round trips when you only need to go one way."
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose OyeGaadi?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              <div className="bg-orange-50 p-4 rounded-full mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-neutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
