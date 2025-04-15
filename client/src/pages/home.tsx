import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { PopularRoutes } from "@/components/home/popular-routes";
import { HowItWorks } from "@/components/home/how-it-works";
import { KycInfo } from "@/components/home/kyc-info";
import { Testimonials } from "@/components/home/testimonials";
import { TimeDisclaimer } from "@/components/home/time-disclaimer";
import { CtaSection } from "@/components/home/cta-section";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Features />
        <PopularRoutes />
        <HowItWorks />
        <KycInfo />
        <Testimonials />
        <TimeDisclaimer />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
