import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, StarHalf } from "lucide-react";

interface Testimonial {
  name: string;
  rating: number;
  image: string;
  text: string;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-yellow-400" />);
    }

    return stars;
  };

  return (
    <Card className="bg-neutral-50">
      <CardContent className="p-6">
        <div className="flex mb-4">
          <Avatar className="h-14 w-14 mr-4">
            <AvatarImage src={testimonial.image} alt={testimonial.name} />
            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium">{testimonial.name}</h4>
            <div className="flex text-yellow-400 text-sm">
              {renderStars(testimonial.rating)}
            </div>
          </div>
        </div>
        <p className="text-neutral-600">{testimonial.text}</p>
      </CardContent>
    </Card>
  );
}

export function Testimonials() {
  const testimonials: Testimonial[] = [
    {
      name: "Priya Sharma",
      rating: 5,
      image: "https://randomuser.me/api/portraits/women/12.jpg",
      text: "\"Found an affordable ride from Delhi to Agra when all other options were expensive. The driver was professional and the journey was comfortable.\""
    },
    {
      name: "Rajesh Patel",
      rating: 4.5,
      image: "https://randomuser.me/api/portraits/men/22.jpg",
      text: "\"OyeGaadi made my travel from Aligarh to Agra really smooth by offering a convenient one-way ride at a fair price. I didn’t have to worry about paying for a return trip.\""
    },
    {
      name: "Ananya Singh",
      rating: 4,
      image: "https://randomuser.me/api/portraits/women/33.jpg",
      text: "\"Used the sharing option to travel from Aligarh to Delhi with two other passengers. Saved money and made new friends. Will definitely use again!\""
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">What Our Users Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
