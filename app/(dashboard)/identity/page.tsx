import type { Metadata } from "next";
import { OrganizationView } from "@/components/identity/organization-view";

export const metadata: Metadata = {
  title: "Organization",
};

export default function IdentityPage() {
  return <OrganizationView />;
}
