import type { Metadata } from "next";
import { AgentMcpView } from "@/components/integrations/agent-mcp-view";

export const metadata: Metadata = {
  title: "Kachis Agent",
};

export default function AgentMcpPage() {
  return <AgentMcpView />;
}
