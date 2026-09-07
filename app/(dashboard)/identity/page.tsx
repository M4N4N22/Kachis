import type { Metadata } from "next";
import { IdentityView } from "@/components/identity/identity-view";

export const metadata: Metadata = {
  title: "Midnight Passport",
};

export default function IdentityPage() {
  return <IdentityView />;
}
