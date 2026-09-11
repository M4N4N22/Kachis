import type { Metadata } from "next";
import { AuditsView } from "@/components/analytics/audits-view";

export const metadata: Metadata = {
  title: "Audit Trail",
};

export default function AuditsPage() {
  return <AuditsView />;
}
