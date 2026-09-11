import type { Metadata } from "next";
import { GuardrailsView } from "@/components/guardrails/guardrails-view";

export const metadata: Metadata = {
  title: "Governance Policies",
};

export default function GuardrailsPage() {
  return <GuardrailsView />;
}
