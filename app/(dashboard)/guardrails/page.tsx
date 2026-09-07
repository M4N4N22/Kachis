import type { Metadata } from "next";
import { GuardrailsView } from "@/components/guardrails/guardrails-view";

export const metadata: Metadata = {
  title: "Enterprise Security Guardrails",
};

export default function GuardrailsPage() {
  return <GuardrailsView />;
}
