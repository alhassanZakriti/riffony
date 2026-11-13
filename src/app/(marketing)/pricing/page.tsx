import type { Metadata } from "next";
import { PricingSection } from "@/features/marketing/pricing-section";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free early access to RIFFLEX training. Paid plans will appear here when billing is enabled.",
};

export default function PricingPage() {
  return (
    <div className="pb-10 pt-6">
      <PricingSection id="plans" />
    </div>
  );
}
