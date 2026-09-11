import type { Metadata } from "next";
import { IntegrationsView } from "@/components/integrations/integrations-view";

export const metadata: Metadata = {
  title: "Integrate Kachis",
};

export default function IntegrationsPage() {
  return <IntegrationsView />;
}
