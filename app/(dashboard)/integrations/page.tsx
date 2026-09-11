import type { Metadata } from "next";
import { IntegrationsView } from "@/components/integrations/integrations-view";

export const metadata: Metadata = {
  title: "Integration Workspace",
};

export default function IntegrationsPage() {
  return <IntegrationsView />;
}
