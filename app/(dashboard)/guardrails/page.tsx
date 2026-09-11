import type { Metadata } from "next";
import { GuardrailsView } from "@/components/guardrails/guardrails-view";

export const metadata: Metadata = {
  title: "Company Rules",
};

export default function GuardrailsPage() {
  return <GuardrailsView />;
}
