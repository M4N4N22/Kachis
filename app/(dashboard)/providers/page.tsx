import type { Metadata } from "next";
import { ProvidersView } from "@/components/identity/providers-view";

export const metadata: Metadata = {
  title: "AI Providers (BYOC)",
};

export default function ProvidersPage() {
  return <ProvidersView />;
}
